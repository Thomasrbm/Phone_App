import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RoutineMonthHeatmap from '@/components/RoutineMonthHeatmap';
import RoutineWeekStrip from '@/components/RoutineWeekStrip';
import type { Routine } from '@/db/routines';
import {
  EMPTY_COMPLETIONS,
  EMPTY_STATS,
  routineCompletionsInRangeView,
  routineStatsView,
} from '@/data/views';
import type { FeatherName } from '@/lib/icons';
import { useTheme } from '@/lib/themeContext';

type Props = {
  routine: Routine;
  groupColor: string;
  todayKey: string;
  monthStart: string;
  monthEnd: string;
  todayYear: number;
  todayMonth: number; // 0-11
  expanded: boolean;
  onToggleExpanded: (id: string) => void;
  onEdit: (id: string) => void;
  onArchive: (routine: Routine) => void;
};

// Stats card for one routine: header + stats row + heatmap or week strip.
// Owns its data subscriptions (stats + completion range) so the parent
// doesn't have to call N hooks for N routines, which the rules of hooks
// forbid.
export default function RoutineStatsCard({
  routine,
  groupColor,
  todayKey,
  monthStart,
  monthEnd,
  todayYear,
  todayMonth,
  expanded,
  onToggleExpanded,
  onEdit,
  onArchive,
}: Props) {
  const { theme } = useTheme();
  const stats = routineStatsView.useView(
    { routineId: routine.id, today: todayKey },
    EMPTY_STATS
  );
  const completions = routineCompletionsInRangeView.useView(
    { routineId: routine.id, start: monthStart, end: monthEnd },
    EMPTY_COMPLETIONS
  );
  const iconName = (routine.icon as FeatherName | null) ?? null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginHorizontal: theme.spacing.lg,
          marginBottom: theme.spacing.md,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceAlt,
        },
        cardHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.sm,
        },
        colorDot: {
          width: 10,
          height: 10,
          borderRadius: 5,
          marginRight: theme.spacing.sm,
        },
        cardIcon: {
          width: 22,
          height: 22,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.sm,
        },
        cardTitle: {
          flex: 1,
          fontSize: theme.font.lg,
          fontWeight: '700',
          color: theme.colors.text,
        },
        archiveBtn: {
          padding: 6,
        },
        statsRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.xs,
        },
        statBlock: {
          flex: 1,
        },
        statLabel: {
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        statValue: {
          fontSize: theme.font.xl,
          fontWeight: '800',
          color: theme.colors.text,
          marginTop: 2,
        },
        cardFooter: {
          marginTop: theme.spacing.sm,
          alignItems: 'center',
        },
      }),
    [theme]
  );

  return (
    <TouchableOpacity
      onPress={() => onToggleExpanded(routine.id)}
      activeOpacity={0.7}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        {iconName ? (
          <View style={styles.cardIcon}>
            <Feather name={iconName} size={18} color={groupColor} />
          </View>
        ) : (
          <View style={[styles.colorDot, { backgroundColor: groupColor }]} />
        )}
        <Text style={styles.cardTitle}>{routine.title}</Text>
        <TouchableOpacity
          onPress={() => onEdit(routine.id)}
          hitSlop={8}
          style={styles.archiveBtn}
        >
          <Feather name="edit-2" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onArchive(routine)}
          hitSlop={8}
          style={styles.archiveBtn}
        >
          <Feather name="archive" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={[styles.statValue, { color: groupColor }]}>
            {stats.streak}j
          </Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>30 derniers j.</Text>
          <Text style={styles.statValue}>
            {Math.round(stats.ratio30d * 100)}%
          </Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Complétions</Text>
          <Text style={styles.statValue}>{stats.completed30d}</Text>
        </View>
      </View>
      {expanded ? (
        <RoutineMonthHeatmap
          year={todayYear}
          month={todayMonth}
          completedDays={completions}
          color={groupColor}
          todayKey={todayKey}
        />
      ) : (
        <RoutineWeekStrip
          todayKey={todayKey}
          completedDays={completions}
          color={groupColor}
        />
      )}
      <View style={styles.cardFooter}>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.textMuted}
        />
      </View>
    </TouchableOpacity>
  );
}
