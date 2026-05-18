import { Feather } from '@expo/vector-icons';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { addDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import PagerView, {
  type PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  LinearTransition,
  SlideInLeft,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddTaskInput from '@/components/AddTaskInput';
import AutoSizeMantra from '@/components/AutoSizeMantra';
import DayRoutinesSection from '@/components/DayRoutinesSection';
import DragHandle from '@/components/DragHandle';
import TaskItem from '@/components/TaskItem';
import {
  getCompletionsForDay,
  listGroups,
  listRoutinesByGroup,
  setCompletion,
  type Routine,
  type RoutineGroup,
} from '@/db/routines';
import { getSetting, setSetting } from '@/db/settings';
import {
  createTask,
  listDeletedTasksByDay,
  listTasksByDay,
  softDeleteTask,
  toggleTaskDone,
  type Task,
} from '@/db/tasks';
import { toDayKey } from '@/lib/date';
import {
  getMantras,
  getMantrasEnabled,
  pickMantraForDay,
} from '@/lib/mantras';
import { routinesCache } from '@/lib/routinesCache';
import { useTheme } from '@/lib/themeContext';

const ACTIVE_GROUP_KEY = 'routines_active_group';

// Per-day caches: when the user re-enters a day they've visited in the
// session, the screen renders from cache immediately and the focus
// reload refreshes in the background. Keys are dayKey strings.
const cachedTasksByDay: Record<string, Task[]> = {};
const cachedDeletedCountByDay: Record<string, number> = {};
const cachedCompletedIdsByDay: Record<string, Set<string>> = {};

type SectionKey = 'todo' | 'done';

type ListItem =
  | {
      type: 'header';
      key: string;
      title: string;
      sectionKey: SectionKey;
      sectionTaskIds: string[];
      isFirst: boolean;
      collapsed: boolean;
      count: number;
    }
  | { type: 'task'; key: string; task: Task };

// Fixed window of dates anchored on the initial URL date. The native
// pager scrolls within this list, but only the pages near the active
// index actually mount a <DayContent> (and therefore fire SQL fetches).
// ±30 days is plenty for typical navigation; beyond that the user can
// jump via /calendar.
const PAGES_AROUND = 30;
// Lazy-mount radius. Only DayContents within ±RENDER_HALF of the
// active index are materialised — the rest stay as cheap empty Views.
// 5 = current + 5 neighbours each side, so a tap on any nearby day in
// the month view lands on a pre-mounted page (no fresh mount cost +
// no SQL round-trip on the critical path).
const RENDER_HALF = 5;

type DayScreenProps = {
  // Hub mode props: when provided, the component takes its date from
  // these instead of route params and routes navigation through callbacks
  // instead of router.push. Used by the always-mounted hub at /.
  hubMode?: boolean;
  date?: string;
  onChangeDate?: (date: string) => void;
  onSwipeUp?: () => void;
  onOpenRoutines?: () => void;
  // Called after any task mutation so sibling views in the hub (notably
  // the month view) know they need to refetch derived data.
  onTasksChanged?: () => void;
  // Hub mode: bumped by the routines screen after any structural change
  // (group/routine create/delete/rename/archive). useFocusEffect doesn't
  // fire in hub mode (this screen never loses focus, just opacity), so
  // without this the routines section would stay stale.
  routinesVersion?: number;
};

export default function DayScreen({
  hubMode,
  date: dateProp,
  onChangeDate,
  onSwipeUp,
  onOpenRoutines,
  onTasksChanged,
  routinesVersion,
}: DayScreenProps = {}) {
  const { theme } = useTheme();
  const routeParams = useLocalSearchParams<{ date: string }>();
  const date = dateProp ?? routeParams.date;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<PagerView>(null);
  const isInternalNav = useRef(false);

  // Routines data lives at the screen level: groups, the active group
  // selection, and all routines per group are shared across every
  // mounted DayContent. Previously each DayContent fetched its own
  // copy, which meant N alive DayContents × the same SQL N times +
  // a refetch on every screen refocus (e.g. returning from /routines).
  // Hoisting collapses that to a single fetch per focus.
  const [groups, setGroups] = useState<RoutineGroup[]>(
    () => routinesCache.groups
  );
  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    () => routinesCache.activeGroupId
  );
  const [routinesByGroup, setRoutinesByGroup] = useState<
    Record<string, Routine[]>
  >(() => routinesCache.routinesByGroup);

  const loadRoutinesData = useCallback(
    async (signal: { cancelled: boolean }) => {
      const [allGroups, storedActive] = await Promise.all([
        listGroups(),
        getSetting(ACTIVE_GROUP_KEY),
      ]);
      if (signal.cancelled) return;
      setGroups(allGroups);
      const fallback = allGroups[0]?.id ?? null;
      const active =
        storedActive && allGroups.some((g) => g.id === storedActive)
          ? storedActive
          : fallback;
      setActiveGroupId(active);
      const lists = await Promise.all(
        allGroups.map((g) => listRoutinesByGroup(g.id))
      );
      if (signal.cancelled) return;
      const map: Record<string, Routine[]> = {};
      allGroups.forEach((g, i) => {
        map[g.id] = lists[i];
      });
      setRoutinesByGroup(map);
      routinesCache.groups = allGroups;
      routinesCache.activeGroupId = active;
      routinesCache.routinesByGroup = map;
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      const signal = { cancelled: false };
      loadRoutinesData(signal);
      return () => {
        signal.cancelled = true;
      };
    }, [loadRoutinesData])
  );

  // Hub mode bridge: useFocusEffect never re-fires here (the hub keeps
  // all views mounted), so a structural change made on the routines
  // screen would leave this screen's state stale. The hub bumps
  // routinesVersion after each such change → we refetch.
  const firstRoutinesVersion = useRef(true);
  useEffect(() => {
    if (routinesVersion === undefined) return;
    if (firstRoutinesVersion.current) {
      firstRoutinesVersion.current = false;
      return;
    }
    const signal = { cancelled: false };
    loadRoutinesData(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [routinesVersion, loadRoutinesData]);

  const handleSelectGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId);
    routinesCache.activeGroupId = groupId;
    setSetting(ACTIVE_GROUP_KEY, groupId);
  }, []);

  // The ±30 day pager window is anchored on a date. In standalone-route
  // mode this anchor never changes (the screen remounts when navigating
  // to a different day). In hub mode the screen stays mounted, so when
  // the user picks a far-away day from the month view we re-anchor.
  const [windowAnchor, setWindowAnchor] = useState(date);
  const windowDates = useMemo<string[]>(() => {
    const base = parseISO(windowAnchor);
    const out: string[] = [];
    for (let i = -PAGES_AROUND; i <= PAGES_AROUND; i++) {
      out.push(toDayKey(addDays(base, i)));
    }
    return out;
  }, [windowAnchor]);

  const initialIndex = useMemo(() => {
    const i = windowDates.indexOf(date);
    return i >= 0 ? i : PAGES_AROUND;
  }, [windowDates, date]);

  const [activeIdx, setActiveIdx] = useState(initialIndex);

  // Far-jump overlay: when target date is outside the current pager
  // window, we re-anchor (which can't be animated since DayContents
  // mount/unmount) and slide a lightweight "fake page" overlay across
  // to give the user the visual sensation of a swipe. The real new
  // DayContent mounts under the overlay, ready when the slide ends.
  const [farJump, setFarJump] = useState<null | {
    toDate: string;
    direction: 'right' | 'left';
  }>(null);
  const prevDateRef = useRef(date);
  const farJumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (farJumpTimerRef.current) clearTimeout(farJumpTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isInternalNav.current) {
      isInternalNav.current = false;
      prevDateRef.current = date;
      return;
    }
    const i = windowDates.indexOf(date);
    if (i >= 0) {
      // Within window — instant snap, like Google Calendar.
      pagerRef.current?.setPageWithoutAnimation(i);
      setActiveIdx(i);
    } else {
      // Out of window — fake-page slide for visual continuity while we
      // re-anchor + mount the real DayContent underneath.
      const direction = date > prevDateRef.current ? 'right' : 'left';
      setFarJump({ toDate: date, direction });
      setWindowAnchor(date);
      setActiveIdx(PAGES_AROUND);
      if (farJumpTimerRef.current) clearTimeout(farJumpTimerRef.current);
      farJumpTimerRef.current = setTimeout(() => setFarJump(null), 260);
    }
    prevDateRef.current = date;
  }, [date, windowDates]);

  const onPageSelected = useCallback(
    (e: PagerViewOnPageSelectedEvent) => {
      const idx = e.nativeEvent.position;
      setActiveIdx(idx);
      const newDate = windowDates[idx];
      if (newDate && newDate !== date) {
        isInternalNav.current = true;
        if (onChangeDate) onChangeDate(newDate);
        else router.setParams({ date: newDate });
      }
    },
    [windowDates, date, router, onChangeDate]
  );

  // Animated day change: used by the chevrons + "Aujourd'hui" button.
  // Within-window jumps drive setPage (animated PagerView). Far jumps
  // fall back to the standard path so the useEffect above kicks in the
  // fake-page overlay — same visual treatment as a tap from the month.
  const changeDateAnimated = useCallback(
    (newDate: string) => {
      const i = windowDates.indexOf(newDate);
      if (i < 0) {
        if (onChangeDate) onChangeDate(newDate);
        else router.setParams({ date: newDate });
        return;
      }
      isInternalNav.current = true;
      pagerRef.current?.setPage(i);
      setActiveIdx(i);
      if (onChangeDate) onChangeDate(newDate);
      else router.setParams({ date: newDate });
    },
    [windowDates, router, onChangeDate]
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }}
    >
      {!hubMode ? (
        <Stack.Screen
          options={{
            headerShown: false,
            animation: 'none',
          }}
        />
      ) : null}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={initialIndex}
        offscreenPageLimit={2}
        onPageSelected={onPageSelected}
        scrollEnabled={false}
      >
        {windowDates.map((d, i) => (
          <View key={d} collapsable={false} style={{ flex: 1 }}>
            {Math.abs(i - activeIdx) <= RENDER_HALF ? (
              <DayContent
                date={d}
                width={width}
                groups={groups}
                activeGroupId={activeGroupId}
                routinesByGroup={routinesByGroup}
                onSelectGroup={handleSelectGroup}
                onSwipeUp={onSwipeUp}
                onOpenRoutines={onOpenRoutines}
                onChangeDate={onChangeDate}
                onChangeDateAnimated={changeDateAnimated}
                onTasksChanged={onTasksChanged}
              />
            ) : null}
          </View>
        ))}
      </PagerView>
      {farJump ? (
        <FarJumpOverlay key={farJump.toDate} farJump={farJump} />
      ) : null}
    </View>
  );
}

// Lightweight overlay panel that slides in from the side to mask the
// pager re-anchor + DayContent mount for far jumps. Renders the target
// date as title only (no SQL, no list), so it's free.
function FarJumpOverlay({
  farJump,
}: {
  farJump: { toDate: string; direction: 'right' | 'left' };
}) {
  const { theme } = useTheme();
  const title = useMemo(() => {
    const t = format(parseISO(farJump.toDate), 'EEEE d MMMM yyyy', {
      locale: fr,
    });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }, [farJump.toDate]);
  const Enter =
    farJump.direction === 'right' ? SlideInRight : SlideInLeft;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        farJumpStyles.overlay,
        { backgroundColor: theme.colors.background },
      ]}
      entering={Enter.duration(220).easing(Easing.out(Easing.cubic))}
      exiting={FadeOut.duration(90)}
    >
      <SafeAreaView style={farJumpStyles.inner} edges={['top']}>
        <Text style={[farJumpStyles.title, { color: theme.colors.text }]}>
          {title}
        </Text>
      </SafeAreaView>
    </Animated.View>
  );
}

const farJumpStyles = StyleSheet.create({
  overlay: {
    zIndex: 50,
  },
  inner: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: 16,
    paddingHorizontal: 24,
  },
});

// memo: every setParams re-renders DayScreen, which by default would
// re-render all 5 DayContents. With key={date} the props are stable
// per instance (`date` matches key, `width` is constant on a session),
// so the memo short-circuits the entire subtree. Less work during the
// animation = fewer dropped frames = less perceived flicker on the
// elements that differ between pages (trash badge, date title, etc.).
type DayContentProps = {
  date: string;
  width: number;
  groups: RoutineGroup[];
  activeGroupId: string | null;
  routinesByGroup: Record<string, Routine[]>;
  onSelectGroup: (groupId: string) => void;
  // Hub-mode callbacks forwarded from DayScreen — undefined when used as
  // a standalone route (router fallback then).
  onSwipeUp?: () => void;
  onOpenRoutines?: () => void;
  onChangeDate?: (date: string) => void;
  // Same as onChangeDate but routes through the pager with animation —
  // used by the chevrons + "Aujourd'hui" button so the day change feels
  // like a swipe instead of an instant cut.
  onChangeDateAnimated?: (date: string) => void;
  onTasksChanged?: () => void;
};

const DayContent = memo(function DayContent({
  date,
  width,
  groups,
  activeGroupId,
  routinesByGroup,
  onSelectGroup,
  onSwipeUp,
  onOpenRoutines,
  onChangeDate,
  onChangeDateAnimated,
  onTasksChanged,
}: DayContentProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(
    () => cachedTasksByDay[date] ?? []
  );
  const [deletedCount, setDeletedCount] = useState<number>(
    () => cachedDeletedCountByDay[date] ?? 0
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mantra, setMantra] = useState<string>('');
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => cachedCompletedIdsByDay[date] ?? new Set()
  );
  const [collapsedSections, setCollapsedSections] = useState<
    Record<SectionKey, boolean>
  >({ todo: false, done: false });

  const selectMode = selectedIds.size > 0;
  const isToday = useMemo(() => date === toDayKey(new Date()), [date]);

  const reload = useCallback(async () => {
    const [active, removed] = await Promise.all([
      listTasksByDay(date),
      listDeletedTasksByDay(date),
    ]);
    setTasks(active);
    setDeletedCount(removed.length);
    cachedTasksByDay[date] = active;
    cachedDeletedCountByDay[date] = removed.length;
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Day-specific data only — groups / routinesByGroup / activeGroupId
  // are shared via props from DayScreen. completedIds still belongs
  // here because it varies per day.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getCompletionsForDay(date).then((c) => {
        if (cancelled) return;
        setCompletedIds(c);
        cachedCompletedIdsByDay[date] = c;
      });
      return () => {
        cancelled = true;
      };
    }, [date])
  );

  const toggleSection = useCallback((key: SectionKey) => {
    // Removing/adding rows from the items array triggers the FlatList's
    // itemLayoutAnimation below (reanimated LinearTransition), which
    // animates each row's appearance/disappearance smoothly without the
    // native LayoutAnimation cascade.
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleToggleRoutine = useCallback(
    async (routineId: string, nextDone: boolean) => {
      // Optimistic update so the row feels instant.
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (nextDone) next.add(routineId);
        else next.delete(routineId);
        cachedCompletedIdsByDay[date] = next;
        return next;
      });
      await setCompletion(routineId, date, nextDone);
    },
    [date]
  );

  // A routine only appears on days at or after its creation day.
  // Showing it earlier would let the user "tick" a routine retroactively
  // before it existed, which messes with streak/stats semantics.
  const visibleRoutinesByGroup = useMemo(() => {
    const out: Record<string, Routine[]> = {};
    for (const [groupId, list] of Object.entries(routinesByGroup)) {
      out[groupId] = list.filter((r) => r.createdAt.slice(0, 10) <= date);
    }
    return out;
  }, [routinesByGroup, date]);

  useFocusEffect(
    useCallback(() => {
      if (!isToday) {
        setMantra('');
        return;
      }
      let cancelled = false;
      Promise.all([getMantrasEnabled(), getMantras()]).then(
        ([enabled, state]) => {
          if (cancelled) return;
          if (!enabled) {
            setMantra('');
            return;
          }
          setMantra(pickMantraForDay(date, state.list));
        }
      );
      return () => {
        cancelled = true;
      };
    }, [isToday, date])
  );

  const progress = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    return { total, done, ratio: total === 0 ? 0 : done / total };
  }, [tasks]);

  // Animate the progress bar so checking a task glides smoothly. The
  // initial value matches the current ratio (vs starting from 0) so a
  // DayContent that mounts mid-session doesn't replay the fill from
  // empty — only real ratio changes animate.
  const progressRatio = useSharedValue(progress.ratio);
  useEffect(() => {
    progressRatio.value = withTiming(progress.ratio, {
      duration: 80,
      easing: Easing.out(Easing.quad),
    });
  }, [progress.ratio, progressRatio]);

  // Animate scaleX (GPU, no relayout) rather than width %, which forces
  // Android to relayout the bar every frame and stutters the check
  // interaction. transformOrigin anchors the scale at the left edge so
  // the fill grows from 0 → done ratio toward the right.
  const progressFillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressRatio.value }],
  }));

  // POLISH:all-done-pop — when all tasks transition to done, fade the
  // progress card background and footer text toward the "done" palette.
  // No scale (which would leak outside the card); just a colour shift
  // that stays in the done colours until tasks become incomplete again.
  const allTasksDone = progress.total > 0 && progress.done === progress.total;
  const doneTint = useSharedValue(allTasksDone ? 1 : 0);
  useEffect(() => {
    doneTint.value = withTiming(allTasksDone ? 1 : 0, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    });
  }, [allTasksDone, doneTint]);
  const doneCardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      doneTint.value,
      [0, 1],
      [theme.colors.surfaceAlt, theme.colors.doneSoft]
    ),
  }));
  const doneFooterStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      doneTint.value,
      [0, 1],
      [theme.colors.textMuted, theme.colors.done]
    ),
  }));
  // /POLISH:all-done-pop

  const goToAdjacentDay = useCallback(
    (delta: number) => {
      const newDate = toDayKey(addDays(parseISO(date), delta));
      if (onChangeDateAnimated) onChangeDateAnimated(newDate);
      else if (onChangeDate) onChangeDate(newDate);
      else router.setParams({ date: newDate });
    },
    [date, onChangeDate, onChangeDateAnimated, router]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
    );
  }, [tasks, searchQuery]);

  const items = useMemo<ListItem[]>(() => {
    const todo = filtered.filter((t) => !t.done);
    const done = filtered.filter((t) => t.done);
    const out: ListItem[] = [];
    let isFirst = true;
    if (todo.length > 0) {
      const isCollapsed = collapsedSections.todo;
      out.push({
        type: 'header',
        key: 'h-todo',
        title: 'À faire',
        sectionKey: 'todo',
        sectionTaskIds: todo.map((t) => t.id),
        isFirst,
        collapsed: isCollapsed,
        count: todo.length,
      });
      isFirst = false;
      if (!isCollapsed) {
        for (const t of todo) out.push({ type: 'task', key: t.id, task: t });
      }
    }
    if (done.length > 0) {
      const isCollapsed = collapsedSections.done;
      out.push({
        type: 'header',
        key: 'h-done',
        title: 'Faits',
        sectionKey: 'done',
        sectionTaskIds: done.map((t) => t.id),
        isFirst,
        collapsed: isCollapsed,
        count: done.length,
      });
      if (!isCollapsed) {
        for (const t of done) out.push({ type: 'task', key: t.id, task: t });
      }
    }
    return out;
  }, [filtered, collapsedSections]);

  const handleAdd = useCallback(
    async (params: {
      title: string;
      description: string | null;
      color: string | null;
    }) => {
      await createTask({ day: date, ...params });
      reload();
      onTasksChanged?.();
    },
    [date, reload, onTasksChanged]
  );

  // Optimistic + no reload: a toggle never changes the set of tasks
  // for the day (no new id, no removed id, same order by created_at),
  // so the optimistic local state matches what a reload would return.
  // Skipping the reload removes a round-trip and a second re-render.
  const handleToggle = useCallback(
    async (id: string, done: boolean) => {
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === id
            ? {
                ...t,
                done,
                doneAt: done ? new Date().toISOString() : null,
              }
            : t
        );
        cachedTasksByDay[date] = next;
        return next;
      });
      await toggleTaskDone(id, done);
      onTasksChanged?.();
    },
    [date, onTasksChanged]
  );

  const handleTaskPress = useCallback(
    (id: string) => {
      if (selectMode) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        return;
      }
      router.push(`/task/${id}`);
    },
    [selectMode, router]
  );

  const handleLongPress = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.size > 0 ? prev : new Set([id])));
  }, []);

  const exitSelectMode = () => setSelectedIds(new Set());

  const handleSwipeDelete = useCallback(
    async (id: string) => {
      await softDeleteTask(id);
      reload();
      onTasksChanged?.();
    },
    [reload, onTasksChanged]
  );

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await softDeleteTask(id);
    }
    setSelectedIds(new Set());
    reload();
    onTasksChanged?.();
  };

  const selectAllInSection = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allAlreadyIn = ids.every((id) => next.has(id));
      if (allAlreadyIn) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  };

  const title = format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr });
  const titleCapped = title.charAt(0).toUpperCase() + title.slice(1);

  const openCalendar = useCallback(() => {
    if (onSwipeUp) onSwipeUp();
    else router.push('/calendar');
  }, [router, onSwipeUp]);

  const openRoutines = useCallback(() => {
    if (onOpenRoutines) onOpenRoutines();
    else router.push('/routines');
  }, [router, onOpenRoutines]);

  const goToToday = useCallback(() => {
    const todayKey = toDayKey(new Date());
    if (todayKey === date) return;
    if (onChangeDateAnimated) onChangeDateAnimated(todayKey);
    else if (onChangeDate) onChangeDate(todayKey);
    else router.setParams({ date: todayKey });
  }, [date, router, onChangeDate, onChangeDateAnimated]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        flex: {
          flex: 1,
        },
        flatListContent: {
          // flexGrow:1 stretches the content to fill the viewport so the
          // empty state isn't pinned right under the hub; the top and
          // bottom paddings guarantee comfortable overscroll in both
          // directions even on a day with no tasks.
          flexGrow: 1,
          paddingTop: theme.spacing.xl * 2,
          paddingBottom: theme.spacing.xl * 10,
        },
        topRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        },
        leftActions: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
        },
        rightActions: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
        },
        centerSlot: {
          flex: 1,
          alignItems: 'center',
        },
        iconBtn: {
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        },
        badge: {
          position: 'absolute',
          top: 4,
          right: 2,
          backgroundColor: theme.colors.today,
          minWidth: 14,
          height: 14,
          borderRadius: 7,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 3,
        },
        badgeText: {
          color: theme.colors.textInverse,
          fontSize: 9,
          fontWeight: '700',
        },
        cancelBtn: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        },
        cancelLink: {
          color: theme.colors.accent,
          fontSize: theme.font.md,
          fontWeight: '500',
        },
        selectionTitle: {
          fontSize: theme.font.lg,
          fontWeight: '700',
          color: theme.colors.text,
        },
        dateTitle: {
          fontSize: theme.font.xl,
          fontWeight: '700',
          color: theme.colors.text,
          textAlign: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.sm,
        },
        bottomBar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
        },
        bottomNav: {
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        },
        searchBar: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
        searchIcon: {
          marginRight: theme.spacing.sm,
        },
        searchInput: {
          flex: 1,
          fontSize: theme.font.md,
          color: theme.colors.text,
          paddingVertical: 4,
        },
        sectionHeaderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.sm,
          backgroundColor: theme.colors.background,
        },
        sectionDivider: {
          marginTop: theme.spacing.lg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
        },
        sectionHeader: {
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        sectionHeaderLeft: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        // POLISH:section-dots
        sectionDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          marginRight: theme.spacing.sm,
        },
        // /POLISH:section-dots
        sectionChevron: {
          marginLeft: theme.spacing.sm,
        },
        selectAllBtn: {
          fontSize: theme.font.sm,
          color: '#6940a5',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.3,
        },
        empty: {
          paddingTop: theme.spacing.xl * 2,
          alignItems: 'center',
        },
        emptyIcon: {
          opacity: 0.45,
          marginBottom: theme.spacing.md,
        },
        emptyText: {
          fontSize: theme.font.lg,
          color: theme.colors.textMuted,
        },
        emptyHint: {
          fontSize: theme.font.md,
          color: theme.colors.textMuted,
          marginTop: theme.spacing.sm,
        },
        deleteBar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#e03e3e',
          paddingVertical: theme.spacing.md,
          gap: theme.spacing.sm,
        },
        deleteBarText: {
          color: theme.colors.textInverse,
          fontSize: theme.font.lg,
          fontWeight: '700',
        },
        hub: {
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.md,
        },
        hubMantra: {
          color: theme.colors.text,
          fontWeight: '600',
          fontStyle: 'italic',
          paddingHorizontal: theme.spacing.md,
        },
        backToTodayBtn: {
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          marginBottom: theme.spacing.sm,
          borderRadius: theme.radius.pill,
          // Pseudo-glass: surface tinted with alpha so the underlying
          // content shows through faintly. True frosted blur would need
          // expo-blur (native rebuild).
          backgroundColor: `${theme.colors.surface}b3`,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: `${theme.colors.border}80`,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 3,
        },
        backToTodayLabel: {
          fontSize: theme.font.sm,
          color: theme.colors.today,
          fontWeight: '600',
        },
        hubProgressCard: {
          marginTop: theme.spacing.lg,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceAlt,
        },
        hubProgressHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: theme.spacing.sm,
        },
        hubProgressLabel: {
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        hubProgressCount: {
          fontSize: theme.font.lg,
          color: theme.colors.text,
          fontWeight: '700',
        },
        hubProgressBar: {
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.colors.border,
          overflow: 'hidden',
        },
        hubProgressFill: {
          height: '100%',
          width: '100%',
          backgroundColor: theme.colors.done,
          borderRadius: 4,
          transformOrigin: 'left',
        },
        hubProgressFooter: {
          marginTop: theme.spacing.sm,
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
        },
      }),
    [theme]
  );

  const renderHub = () => {
    const showProgress = isToday;
    const remaining = progress.total - progress.done;
    const allDone = progress.total > 0 && progress.done === progress.total;
    const footer =
      progress.total === 0
        ? 'Aucune tâche pour aujourd\'hui.'
        : allDone
          ? 'Journée bouclée ✓'
          : `${remaining} restante${remaining > 1 ? 's' : ''}`;
    return (
      <View style={styles.hub}>
        {mantra ? (
          <TouchableOpacity
            onLongPress={() => router.push('/settings')}
            delayLongPress={400}
            activeOpacity={0.7}
          >
            <AutoSizeMantra text={`« ${mantra} »`} style={styles.hubMantra} />
          </TouchableOpacity>
        ) : null}
        <DayRoutinesSection
          groups={groups}
          activeGroupId={activeGroupId}
          routinesByGroup={visibleRoutinesByGroup}
          completedIds={completedIds}
          onSelectGroup={onSelectGroup}
          onToggle={handleToggleRoutine}
          onOpenTracker={openRoutines}
        />
        {showProgress ? (
          // POLISH:all-done-pop — Animated.View wraps the card so its
          // background tints when allDone.
          <Animated.View style={[styles.hubProgressCard, doneCardStyle]}>
            <View style={styles.hubProgressHeader}>
              <Text style={styles.hubProgressLabel}>Progrès du jour</Text>
              <Text style={styles.hubProgressCount}>
                {progress.done}/{progress.total}
              </Text>
            </View>
            <View style={styles.hubProgressBar}>
              <Animated.View
                style={[styles.hubProgressFill, progressFillStyle]}
              />
            </View>
            <Animated.Text
              style={[styles.hubProgressFooter, doneFooterStyle]}
            >
              {footer}
            </Animated.Text>
          </Animated.View>
          // /POLISH:all-done-pop
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { width }]}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {selectMode ? (
          <View style={styles.topRow}>
            <View style={styles.leftActions}>
              <TouchableOpacity
                onPress={exitSelectMode}
                hitSlop={8}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelLink}>Annuler</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.centerSlot}>
              <Text style={styles.selectionTitle}>
                {selectedIds.size} sélectionnée
                {selectedIds.size > 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.rightActions} />
          </View>
        ) : (
          <>
            <View style={styles.topRow}>
              <View style={styles.leftActions}>
                <TouchableOpacity
                  onPress={() => setSearchOpen((s) => !s)}
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <Feather
                    name="search"
                    size={22}
                    color={
                      searchOpen ? theme.colors.accent : theme.colors.text
                    }
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.centerSlot} />
              <View style={styles.rightActions}>
                <TouchableOpacity
                  onPress={() => router.push(`/trash/${date}`)}
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <Feather
                    name="trash-2"
                    size={22}
                    color={theme.colors.text}
                  />
                  {deletedCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{deletedCount}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/settings')}
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <Feather
                    name="settings"
                    size={22}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.dateTitle}>{titleCapped}</Text>
          </>
        )}

        {searchOpen && !selectMode ? (
          <Animated.View
            style={styles.searchBar}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
          >
            <Feather
              name="search"
              size={16}
              color={theme.colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher dans ce jour…"
              placeholderTextColor={theme.colors.textSubtle}
              style={styles.searchInput}
              autoFocus
              returnKeyType="search"
            />
          </Animated.View>
        ) : null}

        <Animated.FlatList
          style={styles.flex}
          contentContainerStyle={styles.flatListContent}
          overScrollMode="always"
          showsVerticalScrollIndicator={false}
          data={items}
          keyExtractor={(item) => item.key}
          // Smooth task row appearance / disappearance / reorder.
          // Safe to enable now that routines fold uses a pure transform
          // (scaleY) which doesn't shift the header's layout per-frame
          // — so this no longer cascades.
          itemLayoutAnimation={LinearTransition.duration(80)}
          ListHeaderComponent={renderHub()}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              const allSelected =
                selectMode &&
                item.sectionTaskIds.length > 0 &&
                item.sectionTaskIds.every((id) => selectedIds.has(id));
              return (
                <Animated.View
                  entering={FadeIn.duration(80).easing(
                    Easing.out(Easing.quad)
                  )}
                  exiting={FadeOut.duration(50).easing(
                    Easing.out(Easing.quad)
                  )}
                >
                <TouchableOpacity
                  onPress={() => {
                    if (selectMode) return;
                    toggleSection(item.sectionKey);
                  }}
                  activeOpacity={selectMode ? 1 : 0.6}
                  style={[
                    styles.sectionHeaderRow,
                    !item.isFirst && styles.sectionDivider,
                  ]}
                >
                  {/* POLISH:section-dots */}
                  <View style={styles.sectionHeaderLeft}>
                    <View
                      style={[
                        styles.sectionDot,
                        {
                          backgroundColor:
                            item.sectionKey === 'todo'
                              ? theme.colors.today
                              : theme.colors.done,
                        },
                      ]}
                    />
                    <Text style={styles.sectionHeader}>
                      {item.title} · {item.count}
                    </Text>
                  </View>
                  {/* /POLISH:section-dots */}
                  {selectMode ? (
                    <TouchableOpacity
                      onPress={() =>
                        selectAllInSection(item.sectionTaskIds)
                      }
                      hitSlop={8}
                    >
                      <Text style={styles.selectAllBtn}>
                        {allSelected
                          ? 'Tout désélectionner'
                          : 'Tout sélectionner'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Feather
                      name={item.collapsed ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.textSubtle}
                    />
                  )}
                </TouchableOpacity>
                </Animated.View>
              );
            }
            return (
              <Animated.View
                entering={FadeIn.duration(80).easing(
                  Easing.out(Easing.quad)
                )}
                exiting={FadeOut.duration(50).easing(
                  Easing.out(Easing.quad)
                )}
              >
                <TaskItem
                  task={item.task}
                  onToggle={handleToggle}
                  onPress={handleTaskPress}
                  onLongPress={handleLongPress}
                  onSwipeAction={handleSwipeDelete}
                  swipe="delete"
                  selectMode={selectMode}
                  selected={selectedIds.has(item.task.id)}
                />
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather
                name={searchQuery ? 'search' : 'inbox'}
                size={44}
                color={theme.colors.textSubtle}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Aucun résultat'
                  : 'Aucune tâche pour ce jour'}
              </Text>
              {!searchQuery ? (
                <Text style={styles.emptyHint}>
                  Ajoute-en une avec l&apos;input en bas
                </Text>
              ) : null}
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />

        {selectMode ? (
          <TouchableOpacity
            onPress={deleteSelected}
            style={styles.deleteBar}
            activeOpacity={0.8}
          >
            <Feather
              name="trash-2"
              size={18}
              color={theme.colors.textInverse}
            />
            <Text style={styles.deleteBarText}>
              Supprimer ({selectedIds.size})
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            {!isToday ? (
              <TouchableOpacity
                onPress={goToToday}
                style={styles.backToTodayBtn}
                hitSlop={12}
                activeOpacity={0.6}
              >
                {date > toDayKey(new Date()) ? (
                  <>
                    <Feather
                      name="arrow-left"
                      size={20}
                      color={theme.colors.today}
                    />
                    <Text style={styles.backToTodayLabel}>
                      Aujourd&apos;hui
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.backToTodayLabel}>
                      Aujourd&apos;hui
                    </Text>
                    <Feather
                      name="arrow-right"
                      size={20}
                      color={theme.colors.today}
                    />
                  </>
                )}
              </TouchableOpacity>
            ) : null}
            <AddTaskInput onSubmit={handleAdd} />
          </>
        )}
      </KeyboardAvoidingView>
      {!selectMode ? (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            onPress={() => goToAdjacentDay(-1)}
            style={styles.bottomNav}
            hitSlop={12}
            activeOpacity={0.55}
          >
            <Feather
              name="chevron-left"
              size={22}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
          <DragHandle
            direction="up"
            onTrigger={openCalendar}
            label="Calendrier"
          />
          <TouchableOpacity
            onPress={() => goToAdjacentDay(1)}
            style={styles.bottomNav}
            hitSlop={12}
            activeOpacity={0.55}
          >
            <Feather
              name="chevron-right"
              size={22}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      ) : null}
      </SafeAreaView>
    </View>
  );
});
