import { Feather } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import RoutineGroupChip from '@/components/routines/RoutineGroupChip';
import RoutineRow from '@/components/routines/RoutineRow';
import type { Routine, RoutineGroup } from '@/db/routines';
import { softColorBg } from '@/lib/colors';
import { useTheme } from '@/lib/themeContext';

type Props = {
  groups: RoutineGroup[];
  activeGroupId: string | null;
  routinesByGroup: Record<string, Routine[]>;
  completedIds: Set<string>;
  onSelectGroup: (groupId: string) => void;
  onToggle: (routineId: string, nextDone: boolean) => void;
  onOpenTracker: () => void;
};

function DayRoutinesSectionImpl({
  groups,
  activeGroupId,
  routinesByGroup,
  completedIds,
  onSelectGroup,
  onToggle,
  onOpenTracker,
}: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef<FlatList<RoutineGroup>>(null);
  // Live horizontal scroll position of the inner group pager. Chips
  // interpolate their background color from this so the active chip
  // changes in lockstep with the swipe, not after it ends.
  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  // Smooth fold/unfold:
  //   • Visual (scaleY + opacity): GPU animation via reanimated. No
  //     per-frame relayout. Origin = top so it rolls down from header.
  //   • Layout (height: 0 vs auto): toggled in JS state so siblings
  //     snap to position only at the boundaries, not every frame.
  //
  // The animation is fired DIRECTLY from the tap handler (not via a
  // useEffect chained on the `collapsed` state). Going through useEffect
  // adds ~2 frames of latency on unfold because layoutHidden has to flip
  // first and only then the animation can start — perceptible as a
  // dead-time between tap and visual reveal.
  //
  // Content is mounted permanently — the JS mount cost on first unfold
  // would otherwise compete with the animation worklet and stutter it.
  const scaleAnim = useSharedValue(collapsed ? 0 : 1);
  const opacityAnim = useSharedValue(collapsed ? 0 : 1);
  const [layoutHidden, setLayoutHidden] = useState(collapsed);
  const collapseStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleAnim.value }],
    opacity: opacityAnim.value,
  }));

  const toggleCollapsed = () => {
    const next = !collapsed;
    if (!next) {
      // Unfold: layout opens, opacity + scale fire together so the
      // section finishes its reveal at the same beat.
      setLayoutHidden(false);
      opacityAnim.value = withTiming(1, {
        duration: 90,
        easing: Easing.out(Easing.quad),
      });
      scaleAnim.value = withTiming(1, {
        duration: 90,
        easing: Easing.out(Easing.quad),
      });
    } else {
      // Fold: opacity + scale shrink in lockstep so there's no
      // dead-time where the content is already invisible but the
      // layout hasn't snapped yet (that gap reads as "loading").
      opacityAnim.value = withTiming(0, {
        duration: 80,
        easing: Easing.out(Easing.quad),
      });
      scaleAnim.value = withTiming(
        0,
        { duration: 80, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(setLayoutHidden)(true);
        }
      );
    }
    setCollapsed(next);
  };

  const pageWidth = width - theme.spacing.lg * 2;

  const activeIndex = useMemo(() => {
    if (!activeGroupId) return 0;
    const idx = groups.findIndex((g) => g.id === activeGroupId);
    return idx >= 0 ? idx : 0;
  }, [groups, activeGroupId]);

  useEffect(() => {
    if (collapsed) return;
    listRef.current?.scrollToOffset({
      offset: activeIndex * pageWidth,
      animated: false,
    });
  }, [activeIndex, pageWidth, collapsed, groups.length]);

  const handlePageEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    const g = groups[idx];
    if (g && g.id !== activeGroupId) onSelectGroup(g.id);
  };

  const handleChipTap = (idx: number, groupId: string) => {
    listRef.current?.scrollToOffset({
      offset: idx * pageWidth,
      animated: true,
    });
    if (groupId !== activeGroupId) onSelectGroup(groupId);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginTop: theme.spacing.lg,
          paddingHorizontal: theme.spacing.lg,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.sm,
          paddingVertical: 4,
        },
        headerLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        },
        title: {
          fontSize: theme.font.xs,
          fontWeight: '700',
          color: theme.colors.routine,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        headerCounter: {
          fontSize: theme.font.xs,
          fontWeight: '700',
          color: theme.colors.routine,
          letterSpacing: 0.5,
        },
        groupHeader: {
          marginTop: theme.spacing.sm,
          marginBottom: theme.spacing.xs,
          paddingHorizontal: theme.spacing.xs,
          fontSize: theme.font.xs,
          fontWeight: '700',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        tabBar: {
          flexDirection: 'row',
        },
        card: {
          marginTop: theme.spacing.sm,
          borderRadius: theme.radius.lg,
          paddingVertical: theme.spacing.xs,
        },
        empty: {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          alignItems: 'center',
        },
        emptyIcon: {
          opacity: 0.5,
          marginBottom: theme.spacing.xs,
        },
        emptyText: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          textAlign: 'center',
        },
        collapsible: {
          // Scale grows downward from the header instead of from the
          // middle — feels like an accordion unrolling.
          transformOrigin: 'top',
        },
        collapsibleHidden: {
          // Snapped layout shrink to free space below when fully folded.
          // The visual scale animation finishes before this kicks in.
          height: 0,
          overflow: 'hidden',
        },
        statsBtnWrap: {
          marginTop: theme.spacing.md,
          alignItems: 'center',
        },
        statsBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
          elevation: 2,
        },
      }),
    [theme]
  );

  // Per-group done/total used on chips so the user sees which groups
  // are already completed without having to swipe through them.
  // Must stay above any conditional return — Rules of Hooks: hooks
  // run in the same order every render.
  const groupCounts = useMemo(() => {
    const out: Record<string, { done: number; total: number }> = {};
    for (const g of groups) {
      const list = routinesByGroup[g.id] ?? [];
      const total = list.length;
      const done = list.reduce(
        (acc, r) => acc + (completedIds.has(r.id) ? 1 : 0),
        0
      );
      out[g.id] = { done, total };
    }
    return out;
  }, [groups, routinesByGroup, completedIds]);

  if (groups.length === 0) return null;

  // Counter shows fully-completed groups out of total groups that
  // have at least one routine. A group counts as "done" when every
  // routine in it is checked for the current day. Empty groups are
  // ignored from both numerator and denominator.
  const groupsWithRoutines = groups.filter(
    (g) => (routinesByGroup[g.id] ?? []).length > 0
  );
  const totalGroupsCount = groupsWithRoutines.length;
  const doneGroupsCount = groupsWithRoutines.filter((g) =>
    (routinesByGroup[g.id] ?? []).every((r) => completedIds.has(r.id))
  ).length;
  const allGroupsDone =
    totalGroupsCount > 0 && doneGroupsCount === totalGroupsCount;
  const counterLabel =
    totalGroupsCount > 0
      ? `${doneGroupsCount}/${totalGroupsCount}${allGroupsDone ? ' ✓' : ''}`
      : '';

  const renderPage = (group: RoutineGroup) => {
    const list = routinesByGroup[group.id] ?? [];
    const accent = group.color ?? theme.colors.routine;
    const softBg =
      softColorBg(accent, theme.colors.background, 0.12) ??
      theme.colors.routineSoft;
    return (
      <View style={[{ width: pageWidth }]}>
        {groups.length > 1 ? (
          <Text style={[styles.groupHeader, { color: accent }]}>
            {group.name}
          </Text>
        ) : null}
        <View style={[styles.card, { backgroundColor: softBg }]}>
          {list.length === 0 ? (
            <TouchableOpacity onPress={onOpenTracker} style={styles.empty}>
              <Feather
                name="repeat"
                size={28}
                color={accent}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>
                Aucune routine dans ce groupe.{'\n'}Appuie ici pour en ajouter.
              </Text>
            </TouchableOpacity>
          ) : (
            list.map((r) => (
              <RoutineRow
                key={r.id}
                routine={r}
                done={completedIds.has(r.id)}
                accent={accent}
                onToggle={onToggle}
              />
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={toggleCollapsed}
        activeOpacity={0.7}
        style={styles.headerRow}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Routines</Text>
          {counterLabel ? (
            <Text style={styles.headerCounter}>{counterLabel}</Text>
          ) : null}
        </View>
        <Feather
          name={collapsed ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.routine}
        />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.collapsible,
          layoutHidden ? styles.collapsibleHidden : null,
          collapseStyle,
        ]}
        pointerEvents={collapsed ? 'none' : 'auto'}
      >
        {groups.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBar}
            >
              {groups.map((g, i) => {
                const c = groupCounts[g.id] ?? { done: 0, total: 0 };
                return (
                  <RoutineGroupChip
                    key={g.id}
                    group={g}
                    index={i}
                    scrollX={scrollX}
                    pageWidth={pageWidth}
                    done={c.done}
                    total={c.total}
                    onPress={() => handleChipTap(i, g.id)}
                  />
                );
              })}
            </ScrollView>
          ) : null}

          <Animated.FlatList
            ref={listRef}
            data={groups}
            keyExtractor={(g) => g.id}
            horizontal
            snapToInterval={pageWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            bounces={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: pageWidth,
              offset: pageWidth * index,
              index,
            })}
            initialScrollIndex={activeIndex}
            onMomentumScrollEnd={handlePageEnd}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            renderItem={({ item }) => renderPage(item)}
          />
          <View style={styles.statsBtnWrap}>
            <TouchableOpacity
              onPress={onOpenTracker}
              activeOpacity={0.7}
              hitSlop={8}
              style={styles.statsBtn}
            >
              <Feather
                name="bar-chart-2"
                size={20}
                color={theme.colors.routine}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
    </View>
  );
}

// memo: DayRoutinesSection sits inside the day hub which re-renders
// whenever DayContent re-renders. Without memo, every task tick / row
// re-layout would re-instantiate all RoutineGroupChip animated styles
// below.
const DayRoutinesSection = memo(DayRoutinesSectionImpl);
export default DayRoutinesSection;
