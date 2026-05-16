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
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddTaskInput from '@/components/AddTaskInput';
import AutoSizeMantra from '@/components/AutoSizeMantra';
import CalendarButton from '@/components/CalendarButton';
import DayRoutinesSection from '@/components/DayRoutinesSection';
import DragHandle from '@/components/DragHandle';
import RoutineTrackerButton from '@/components/RoutineTrackerButton';
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
import { useTheme } from '@/lib/themeContext';

const ACTIVE_GROUP_KEY = 'routines_active_group';

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

const SWIPE_COMMIT_PX = 100;
// Pre-render ±2 days around the centre so the page that slides into view
// after a commit is already mounted with its data — eliminates the empty
// "fresh mount" flash you'd see with only prev/current/next rendered.
const PAGE_HALF = 2;

export default function DayScreen() {
  const { theme } = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const tx = useSharedValue(0);
  const isInternalNav = useRef(false);

  const surroundingDates = useMemo(() => {
    const base = parseISO(date);
    const out: string[] = [];
    for (let i = -PAGE_HALF; i <= PAGE_HALF; i++) {
      out.push(toDayKey(addDays(base, i)));
    }
    return out;
  }, [date]);

  const prevDate = surroundingDates[PAGE_HALF - 1];
  const nextDate = surroundingDates[PAGE_HALF + 1];

  const goToDate = useCallback(
    (newDate: string) => {
      isInternalNav.current = true;
      router.setParams({ date: newDate });
    },
    [router]
  );

  // Reset translation BEFORE the next paint when the URL date changes,
  // so the new "center" page lines up under the viewport with no
  // flashed frame of the wrong content (running this in useEffect lets
  // a frame render at the old translation under the new page lineup).
  useLayoutEffect(() => {
    tx.value = 0;
    isInternalNav.current = false;
  }, [date, tx]);

  // Custom pan instead of a FlatList pager: a FlatList paginated outer
  // eats horizontal touches that should reach inner pagers (routine
  // groups) and even short taps on AddTaskInput. With Gesture.Pan we
  // require explicit horizontal commitment (activeOffsetX > 25 px) and
  // fail on strong vertical drift so the inner tasks scroll keeps
  // working. Inner native scrollables (routine FlatList paginated)
  // capture their own gestures first when the touch starts inside them.
  const dayPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-25, 25])
        .failOffsetY([-20, 20])
        .onUpdate((e) => {
          'worklet';
          tx.value = e.translationX;
        })
        .onEnd((e) => {
          'worklet';
          if (e.translationX < -SWIPE_COMMIT_PX) {
            tx.value = withTiming(-width, { duration: 200 }, (done) => {
              if (done) runOnJS(goToDate)(nextDate);
            });
          } else if (e.translationX > SWIPE_COMMIT_PX) {
            tx.value = withTiming(width, { duration: 200 }, (done) => {
              if (done) runOnJS(goToDate)(prevDate);
            });
          } else {
            tx.value = withSpring(0, { damping: 22, stiffness: 220 });
          }
        }),
    [tx, width, prevDate, nextDate, goToDate]
  );

  const pagesStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  return (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        backgroundColor: theme.colors.background,
      }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <GestureDetector gesture={dayPan}>
        <Animated.View
          style={[
            {
              flex: 1,
              flexDirection: 'row',
              width: width * surroundingDates.length,
              marginLeft: -width * PAGE_HALF,
            },
            pagesStyle,
          ]}
        >
          {/* key={date} so React reconciles by date, not by position. As
              the centre date changes, the side pages (±2 days) keep
              their instances and data; only the new outermost page is
              freshly mounted. The previously-visible neighbour is
              already loaded, so the 1-frame transitional flash shows
              real content, not an empty skeleton. */}
          {surroundingDates.map((d) => (
            <DayContent key={d} date={d} width={width} />
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function DayContent({ date, width }: { date: string; width: number }) {
  const { theme } = useTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deletedCount, setDeletedCount] = useState<number>(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mantra, setMantra] = useState<string>('');
  const [groups, setGroups] = useState<RoutineGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [routinesByGroup, setRoutinesByGroup] = useState<
    Record<string, Routine[]>
  >({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
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
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [allGroups, storedActive, dayCompletions] = await Promise.all([
          listGroups(),
          getSetting(ACTIVE_GROUP_KEY),
          getCompletionsForDay(date),
        ]);
        if (cancelled) return;
        setGroups(allGroups);
        setCompletedIds(dayCompletions);
        const fallback = allGroups[0]?.id ?? null;
        const active =
          storedActive && allGroups.some((g) => g.id === storedActive)
            ? storedActive
            : fallback;
        setActiveGroupId(active);
        // Fetch routines for every group up-front so the horizontal pager
        // can scroll across them without flickering. N stays small.
        const lists = await Promise.all(
          allGroups.map((g) => listRoutinesByGroup(g.id))
        );
        if (cancelled) return;
        const map: Record<string, Routine[]> = {};
        allGroups.forEach((g, i) => {
          map[g.id] = lists[i];
        });
        setRoutinesByGroup(map);
      })();
      return () => {
        cancelled = true;
      };
    }, [date])
  );

  const handleSelectGroup = useCallback(async (groupId: string) => {
    setActiveGroupId(groupId);
    await setSetting(ACTIVE_GROUP_KEY, groupId);
  }, []);

  const toggleSection = useCallback((key: SectionKey) => {
    // Native LayoutAnimation handles both the rows disappearing and
    // the sibling section sliding into the freed space in one pass.
    LayoutAnimation.configureNext({
      duration: 220,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleToggleRoutine = useCallback(
    async (routineId: string, nextDone: boolean) => {
      // Optimistic update so the row feels instant.
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (nextDone) next.add(routineId);
        else next.delete(routineId);
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

  // Animate the progress bar width so checking off a task glides
  // instead of snapping.
  const progressRatio = useSharedValue(0);
  useEffect(() => {
    progressRatio.value = withTiming(progress.ratio, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress.ratio, progressRatio]);

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${progressRatio.value * 100}%`,
  }));

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

  const handleAdd = async (params: {
    title: string;
    description: string | null;
    color: string | null;
  }) => {
    await createTask({ day: date, ...params });
    reload();
  };

  const handleToggle = async (id: string, done: boolean) => {
    await toggleTaskDone(id, done);
    reload();
  };

  const handleTaskPress = (id: string) => {
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
  };

  const handleLongPress = (id: string) => {
    if (selectMode) return;
    setSelectedIds(new Set([id]));
  };

  const exitSelectMode = () => setSelectedIds(new Set());

  const handleSwipeDelete = async (id: string) => {
    await softDeleteTask(id);
    reload();
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await softDeleteTask(id);
    }
    setSelectedIds(new Set());
    reload();
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
    router.push('/calendar');
  }, [router]);

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
          // Generous breathing room below the last task / empty state so
          // the user can comfortably tap-scroll past the content without
          // hitting the AddTaskInput bar.
          paddingBottom: theme.spacing.xl * 4,
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
        hubButtonsRow: {
          marginTop: theme.spacing.md,
          alignItems: 'center',
        },
        backToTodayBtn: {
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          marginTop: theme.spacing.lg,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
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
          backgroundColor: theme.colors.done,
          borderRadius: 4,
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
        {!isToday ? (
          <TouchableOpacity
            onPress={() => {
              const todayKey = toDayKey(new Date());
              if (todayKey !== date) {
                router.setParams({ date: todayKey });
              }
            }}
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
                <Text style={styles.backToTodayLabel}>Aujourd&apos;hui</Text>
              </>
            ) : (
              <>
                <Text style={styles.backToTodayLabel}>Aujourd&apos;hui</Text>
                <Feather
                  name="arrow-right"
                  size={20}
                  color={theme.colors.today}
                />
              </>
            )}
          </TouchableOpacity>
        ) : null}
        <View style={styles.hubButtonsRow}>
          <RoutineTrackerButton onPress={() => router.push('/routines')} />
        </View>
        <DayRoutinesSection
          groups={groups}
          activeGroupId={activeGroupId}
          routinesByGroup={visibleRoutinesByGroup}
          completedIds={completedIds}
          onSelectGroup={handleSelectGroup}
          onToggle={handleToggleRoutine}
          onOpenTracker={() => router.push('/routines')}
        />
        {showProgress ? (
          <View style={styles.hubProgressCard}>
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
            <Text style={styles.hubProgressFooter}>{footer}</Text>
          </View>
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
              <View style={styles.centerSlot}>
                <CalendarButton onPress={openCalendar} />
              </View>
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
          <View style={styles.searchBar}>
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
          </View>
        ) : null}

        <Animated.FlatList
          style={styles.flex}
          contentContainerStyle={styles.flatListContent}
          data={items}
          keyExtractor={(item) => item.key}
          itemLayoutAnimation={LinearTransition.duration(300)}
          ListHeaderComponent={renderHub()}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              const allSelected =
                selectMode &&
                item.sectionTaskIds.length > 0 &&
                item.sectionTaskIds.every((id) => selectedIds.has(id));
              return (
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
                  <Text style={styles.sectionHeader}>
                    {item.title} · {item.count}
                  </Text>
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
              );
            }
            return (
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
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Aucun résultat.'
                  : 'Aucune tâche pour ce jour.'}
              </Text>
              {!searchQuery ? (
                <Text style={styles.emptyHint}>
                  Ajoute-en une avec l&apos;input en bas.
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
          <AddTaskInput onSubmit={handleAdd} />
        )}
      </KeyboardAvoidingView>
      {!selectMode ? (
        <DragHandle
          direction="up"
          onTrigger={openCalendar}
          label="Calendrier"
        />
      ) : null}
      </SafeAreaView>
    </View>
  );
}
