import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
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
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import DragHandle from '@/components/DragHandle';
import { useTheme } from '@/lib/themeContext';
import { softColorBg } from '@/lib/colors';
import type { FeatherName } from '@/lib/icons';
import type { Routine, RoutineGroup } from '@/db/routines';

type Props = {
  groups: RoutineGroup[];
  activeGroupId: string | null;
  routinesByGroup: Record<string, Routine[]>;
  completedIds: Set<string>;
  onSelectGroup: (groupId: string) => void;
  onToggle: (routineId: string, nextDone: boolean) => void;
  onOpenTracker: () => void;
};

export default function DayRoutinesSection({
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

  const toggleCollapsed = () => {
    // Native LayoutAnimation: the OS interpolates the layout change in
    // one pass. Much lighter than animating height per-frame via
    // Reanimated when the section has many siblings (tasks list) below
    // that have to reflow each frame.
    LayoutAnimation.configureNext({
      duration: 220,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    setCollapsed((c) => !c);
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
          flex: 1,
        },
        headerRight: {
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
        chevron: {
          marginLeft: 0,
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
        chip: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: 6,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surfaceAlt,
          marginRight: theme.spacing.sm,
        },
        chipText: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          fontWeight: '600',
        },
        chipTextActive: {
          color: theme.colors.textInverse,
        },
        card: {
          marginTop: theme.spacing.sm,
          borderRadius: theme.radius.lg,
          paddingVertical: theme.spacing.xs,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        },
        check: {
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.sm,
          backgroundColor: 'transparent',
        },
        iconBox: {
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.sm,
        },
        routineText: {
          flex: 1,
          fontSize: theme.font.md,
          color: theme.colors.text,
          fontWeight: '500',
        },
        routineTextDone: {
          color: theme.colors.textMuted,
          textDecorationLine: 'line-through',
        },
        empty: {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          alignItems: 'center',
        },
        handleWrap: {
          marginTop: theme.spacing.xs,
        },
        emptyText: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          textAlign: 'center',
        },
      }),
    [theme]
  );

  if (groups.length === 0) return null;

  const activeRoutines = activeGroupId
    ? routinesByGroup[activeGroupId] ?? []
    : [];
  const doneCount = activeRoutines.filter((r) =>
    completedIds.has(r.id)
  ).length;
  const allDone =
    activeRoutines.length > 0 && doneCount === activeRoutines.length;
  const counterLabel =
    activeRoutines.length > 0
      ? `${doneCount}/${activeRoutines.length}${allDone ? ' ✓' : ''}`
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
              <Text style={styles.emptyText}>
                Aucune routine dans ce groupe.{'\n'}Appuie ici pour en ajouter.
              </Text>
            </TouchableOpacity>
          ) : (
            list.map((r) => {
              const done = completedIds.has(r.id);
              const iconName = (r.icon as FeatherName | null) ?? null;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => onToggle(r.id, !done)}
                  activeOpacity={0.7}
                  style={styles.row}
                >
                  <View
                    style={[
                      styles.check,
                      { borderColor: accent },
                      done && { backgroundColor: accent },
                    ]}
                  >
                    {done ? (
                      <Feather
                        name="check"
                        size={14}
                        color={theme.colors.textInverse}
                      />
                    ) : iconName ? (
                      <Feather name={iconName} size={12} color={accent} />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.routineText,
                      done && styles.routineTextDone,
                    ]}
                  >
                    {r.title}
                  </Text>
                </TouchableOpacity>
              );
            })
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
        </View>
        <View style={styles.headerRight}>
          {counterLabel ? (
            <Text style={styles.headerCounter}>{counterLabel}</Text>
          ) : null}
          <Feather
            name={collapsed ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.routine}
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>

      {collapsed ? null : (
        <View>
          {groups.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBar}
            >
              {groups.map((g, i) => (
                <GroupChip
                  key={g.id}
                  group={g}
                  index={i}
                  scrollX={scrollX}
                  pageWidth={pageWidth}
                  fallbackColor={theme.colors.routine}
                  inactiveBg={theme.colors.surfaceAlt}
                  activeText={theme.colors.textInverse}
                  inactiveText={theme.colors.textMuted}
                  onPress={() => handleChipTap(i, g.id)}
                  chipStyle={styles.chip}
                  chipTextStyle={styles.chipText}
                />
              ))}
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
          <View style={styles.handleWrap}>
            <DragHandle
              direction="up"
              onTrigger={onOpenTracker}
              label="Stats"
            />
          </View>
        </View>
      )}
    </View>
  );
}

// Chip whose background/text interpolate as the inner pager scrolls,
// so the active state changes in lockstep with the swipe instead of
// snapping after onMomentumScrollEnd.
function GroupChip({
  group,
  index,
  scrollX,
  pageWidth,
  fallbackColor,
  inactiveBg,
  activeText,
  inactiveText,
  onPress,
  chipStyle,
  chipTextStyle,
}: {
  group: RoutineGroup;
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
  fallbackColor: string;
  inactiveBg: string;
  activeText: string;
  inactiveText: string;
  onPress: () => void;
  chipStyle: object;
  chipTextStyle: object;
}) {
  const chipColor = group.color ?? fallbackColor;

  const bgStyle = useAnimatedStyle(() => {
    const idx = scrollX.value / pageWidth;
    const dist = Math.min(1, Math.abs(idx - index));
    const t = 1 - dist;
    return {
      backgroundColor: interpolateColor(t, [0, 1], [inactiveBg, chipColor]),
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const idx = scrollX.value / pageWidth;
    const dist = Math.min(1, Math.abs(idx - index));
    const t = 1 - dist;
    return {
      color: interpolateColor(t, [0, 1], [inactiveText, activeText]),
    };
  });

  return (
    <Animated.View style={[chipStyle, bgStyle]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Animated.Text style={[chipTextStyle, textStyle]}>
          {group.name}
        </Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
