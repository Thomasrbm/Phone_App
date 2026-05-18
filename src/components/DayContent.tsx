import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { addDays, parseISO } from 'date-fns';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddTaskInput from '@/components/AddTaskInput';
import AutoSizeMantra from '@/components/AutoSizeMantra';
import DayBottomBar from '@/components/DayBottomBar';
import DayHeader from '@/components/DayHeader';
import DayProgressCard from '@/components/DayProgressCard';
import DayRoutinesSection from '@/components/DayRoutinesSection';
import TaskItem from '@/components/TaskItem';
import type { Routine, RoutineGroup } from '@/db/routines';
import type { Task } from '@/db/tasks';
import {
  createTask,
  setCompletion,
  softDeleteTask,
  toggleTaskDone,
} from '@/data/mutations';
import {
  completionsByDayView,
  deletedTasksByDayView,
  EMPTY_COMPLETIONS,
  EMPTY_TASKS,
  tasksByDayView,
} from '@/data/views';
import { toDayKey, todayKey } from '@/lib/date';
import {
  getMantras,
  getMantrasEnabled,
  pickMantraForDay,
} from '@/lib/mantras';
import { useTheme } from '@/lib/themeContext';

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

// memo: every setParams re-renders DayScreen, which by default would
// re-render all 5 DayContents. With key={date} the props are stable
// per instance (`date` matches key, `width` is constant on a session),
// so the memo short-circuits the entire subtree. Less work during the
// animation = fewer dropped frames = less perceived flicker on the
// elements that differ between pages (trash badge, date title, etc.).
export type DayContentProps = {
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
}: DayContentProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const tasks = tasksByDayView.useView(date, EMPTY_TASKS);
  const deletedTasks = deletedTasksByDayView.useView(date, EMPTY_TASKS);
  const deletedCount = deletedTasks.length;
  const completedIds = completionsByDayView.useView(date, EMPTY_COMPLETIONS);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mantra, setMantra] = useState<string>('');
  const [collapsedSections, setCollapsedSections] = useState<
    Record<SectionKey, boolean>
  >({ todo: false, done: false });

  const selectMode = selectedIds.size > 0;
  const isToday = useMemo(() => date === todayKey(), [date]);

  const toggleSection = useCallback((key: SectionKey) => {
    // Removing/adding rows from the items array triggers the FlatList's
    // itemLayoutAnimation below (reanimated LinearTransition), which
    // animates each row's appearance/disappearance smoothly without the
    // native LayoutAnimation cascade.
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleToggleRoutine = useCallback(
    (routineId: string, nextDone: boolean) => {
      // setCompletion does the optimistic update internally via the view
      // layer, then writes to SQL, then invalidates — sibling subscribers
      // (the routines screen's heatmaps/stats) refresh automatically.
      setCompletion(routineId, date, nextDone);
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
    return { total, done };
  }, [tasks]);

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
    (params: {
      title: string;
      description: string | null;
      color: string | null;
    }) => {
      // mutations.createTask writes + invalidates; the view layer
      // re-fetches and re-renders this component with the new task.
      createTask({ day: date, ...params });
    },
    [date]
  );

  const handleToggle = useCallback(
    (id: string, done: boolean) => {
      // Optimistic flip lives in mutations.toggleTaskDone — same shape
      // as before, just no manual setTasks / cache write.
      toggleTaskDone(id, date, done);
    },
    [date]
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
    (id: string) => {
      softDeleteTask(id, date);
    },
    [date]
  );

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    for (const id of ids) {
      await softDeleteTask(id, date);
    }
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

  const openCalendar = useCallback(() => {
    if (onSwipeUp) onSwipeUp();
    else router.push('/calendar');
  }, [router, onSwipeUp]);

  const openRoutines = useCallback(() => {
    if (onOpenRoutines) onOpenRoutines();
    else router.push('/routines');
  }, [router, onOpenRoutines]);

  const goToToday = useCallback(() => {
    const today = todayKey();
    if (today === date) return;
    if (onChangeDateAnimated) onChangeDateAnimated(today);
    else if (onChangeDate) onChangeDate(today);
    else router.setParams({ date: today });
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
      }),
    [theme]
  );

  const renderHub = () => (
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
      {isToday ? (
        <DayProgressCard done={progress.done} total={progress.total} />
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { width }]}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <DayHeader
            date={date}
            selectMode={selectMode}
            selectedCount={selectedIds.size}
            searchOpen={searchOpen}
            deletedCount={deletedCount}
            onCancelSelect={exitSelectMode}
            onToggleSearch={() => setSearchOpen((s) => !s)}
            onOpenTrash={() => router.push(`/trash/${date}`)}
            onOpenSettings={() => router.push('/settings')}
          />

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
                  entering={FadeIn.duration(80).easing(Easing.out(Easing.quad))}
                  exiting={FadeOut.duration(50).easing(Easing.out(Easing.quad))}
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
                  {searchQuery ? 'Aucun résultat' : 'Aucune tâche pour ce jour'}
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
              <Feather name="trash-2" size={18} color={theme.colors.textInverse} />
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
                  {date > todayKey() ? (
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
          <DayBottomBar
            onPrevDay={() => goToAdjacentDay(-1)}
            onNextDay={() => goToAdjacentDay(1)}
            onOpenCalendar={openCalendar}
          />
        ) : null}
      </SafeAreaView>
    </View>
  );
});

export default DayContent;
