import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Objective } from '@/db/objectives';
import { todayKey } from '@/lib/date';
import { useTheme } from '@/lib/themeContext';

type Props = {
  // Flat list of all non-deleted objectives.
  objectives: Objective[];
};

// Compact stats strip at the very top of the overview. Three figures:
//   - done / total (overall completion ratio)
//   - en retard (count of non-done objectives whose deadline is past)
//   - cette semaine (non-done deadlines in the next 7 days, today
//     included; overdue not counted here so the two numbers stay
//     disjoint and useful)
//
// Each figure is a big number + a small label. The "en retard" tile
// flips to objectiveLong red when > 0 — visual signal that something
// needs attention.
export default function ObjectivesStatsHeader({ objectives }: Props) {
  const { theme } = useTheme();

  const stats = useMemo(() => {
    const t = new Date(todayKey() + 'T00:00:00').getTime();
    let total = 0;
    let done = 0;
    let overdue = 0;
    let thisWeek = 0;
    for (const o of objectives) {
      total++;
      if (o.done) {
        done++;
        continue;
      }
      if (!o.deadline) continue;
      const d = new Date(o.deadline + 'T00:00:00').getTime();
      const diffDays = Math.round((d - t) / 86400000);
      if (diffDays < 0) overdue++;
      else if (diffDays <= 7) thisWeek++;
    }
    const ratio = total === 0 ? 0 : done / total;
    return { total, done, overdue, thisWeek, ratio };
  }, [objectives]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.lg,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceAlt,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        col: {
          flex: 1,
          alignItems: 'center',
        },
        divider: {
          width: StyleSheet.hairlineWidth,
          height: 32,
          backgroundColor: theme.colors.border,
        },
        bigNumber: {
          fontSize: 22,
          fontWeight: '800',
          color: theme.colors.text,
        },
        bigNumberAlarm: {
          color: theme.colors.objectiveLong,
        },
        label: {
          fontSize: 10,
          fontWeight: '700',
          color: theme.colors.textSubtle,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 2,
        },
        labelAlarm: {
          color: theme.colors.objectiveLong,
        },
      }),
    [theme]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.col}>
        <Text style={styles.bigNumber}>
          {stats.done}/{stats.total}
        </Text>
        <Text style={styles.label}>
          atteints {stats.total > 0 ? `· ${Math.round(stats.ratio * 100)}%` : ''}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.col}>
        <Text
          style={[styles.bigNumber, stats.overdue > 0 && styles.bigNumberAlarm]}
        >
          {stats.overdue}
        </Text>
        <Text
          style={[styles.label, stats.overdue > 0 && styles.labelAlarm]}
        >
          en retard
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.col}>
        <Text style={styles.bigNumber}>{stats.thisWeek}</Text>
        <Text style={styles.label}>cette semaine</Text>
      </View>
    </View>
  );
}
