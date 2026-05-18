import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ObjectiveHorizon } from '@/db/objectives';
import { useTheme } from '@/lib/themeContext';

const HORIZON_PRIORITY: Record<ObjectiveHorizon, number> = {
  long: 0,
  medium: 1,
  short: 2,
};

type Props = {
  // Same shape the year view expects: dayKey → most-urgent horizon.
  // We aggregate per year to compute the indicator dot colour + count.
  deadlinesByDay: Map<string, ObjectiveHorizon>;
  // Year currently drilled-into, or null when no year is selected
  // (the year view stays hidden in that case).
  selectedYear: number | null;
  onSelectYear: (year: number) => void;
};

// 10-year chronological frieze. Default range starts 2 years in the
// past and stretches 7 years into the future — long-term goals are
// forward-biased, but recently-past objectives shouldn't disappear
// when the year flips. < decade > arrows shift the window by 10 at
// a time.
//
// Each year cell shows: the year number, and a small horizon-coloured
// dot if there's at least one deadline that year. The dot's colour is
// the most-urgent horizon present. A count badge appears when 2+
// deadlines.
//
// Tapping a year sets it as `selectedYear` — the parent renders the
// detailed year view below.
export default function ObjectivesDecadeStrip({
  deadlinesByDay,
  selectedYear,
  onSelectYear,
}: Props) {
  const { theme } = useTheme();
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // windowStart drifts by 10 when the user navigates decades. Default
  // anchors the current year at position 2 in the strip.
  const [windowStart, setWindowStart] = useState(currentYear - 2);

  // Build the per-year summary in a single pass over the deadlines map.
  const yearSummary = useMemo(() => {
    const out = new Map<
      number,
      { count: number; topHorizon: ObjectiveHorizon }
    >();
    for (const [dayKey, horizon] of deadlinesByDay) {
      const y = parseInt(dayKey.slice(0, 4), 10);
      const existing = out.get(y);
      if (!existing) {
        out.set(y, { count: 1, topHorizon: horizon });
      } else {
        const top =
          HORIZON_PRIORITY[horizon] < HORIZON_PRIORITY[existing.topHorizon]
            ? horizon
            : existing.topHorizon;
        out.set(y, { count: existing.count + 1, topHorizon: top });
      }
    }
    return out;
  }, [deadlinesByDay]);

  const years = useMemo(
    () => Array.from({ length: 10 }, (_, i) => windowStart + i),
    [windowStart]
  );

  const horizonColor = (h: ObjectiveHorizon): string => {
    if (h === 'long') return theme.colors.objectiveLong;
    if (h === 'medium') return theme.colors.objectiveMedium;
    return theme.colors.objectiveShort;
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.lg,
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceAlt,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.sm,
        },
        title: {
          fontSize: theme.font.xs,
          fontWeight: '700',
          color: theme.colors.textSubtle,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        navBtn: {
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
        },
        rangeLabel: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          fontWeight: '600',
        },
        strip: {
          flexDirection: 'row',
          gap: 4,
        },
        yearCell: {
          flex: 1,
          alignItems: 'center',
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: 'transparent',
        },
        yearCellSelected: {
          borderColor: theme.colors.text,
        },
        yearCellCurrent: {
          backgroundColor: theme.colors.background,
        },
        yearLabel: {
          fontSize: theme.font.sm,
          fontWeight: '700',
          color: theme.colors.text,
        },
        yearLabelMuted: {
          color: theme.colors.textMuted,
        },
        yearTodayMark: {
          fontSize: 8,
          color: theme.colors.textSubtle,
          marginTop: 1,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        indicator: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          marginTop: 4,
          minHeight: 10,
        },
        dot: {
          width: 6,
          height: 6,
          borderRadius: 3,
        },
        countBadge: {
          fontSize: 9,
          fontWeight: '700',
          color: theme.colors.text,
        },
        hint: {
          marginTop: theme.spacing.sm,
          textAlign: 'center',
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
        },
      }),
    [theme]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setWindowStart((w) => w - 10)}
          style={styles.navBtn}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Vision 10 ans</Text>
        <Text style={styles.rangeLabel}>
          {windowStart} – {windowStart + 9}
        </Text>
        <TouchableOpacity
          onPress={() => setWindowStart((w) => w + 10)}
          style={styles.navBtn}
          hitSlop={8}
        >
          <Feather name="chevron-right" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.strip}>
        {years.map((y) => {
          const summary = yearSummary.get(y);
          const isSelected = selectedYear === y;
          const isCurrent = y === currentYear;
          return (
            <TouchableOpacity
              key={y}
              onPress={() => onSelectYear(y)}
              activeOpacity={0.7}
              style={[
                styles.yearCell,
                isCurrent && styles.yearCellCurrent,
                isSelected && styles.yearCellSelected,
              ]}
            >
              <Text
                style={[
                  styles.yearLabel,
                  !summary && !isCurrent && styles.yearLabelMuted,
                ]}
              >
                {y}
              </Text>
              {isCurrent ? (
                <Text style={styles.yearTodayMark}>now</Text>
              ) : null}
              <View style={styles.indicator}>
                {summary ? (
                  <>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: horizonColor(summary.topHorizon) },
                      ]}
                    />
                    {summary.count > 1 ? (
                      <Text style={styles.countBadge}>{summary.count}</Text>
                    ) : null}
                  </>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedYear === null ? (
        <Text style={styles.hint}>Appuie sur une année pour voir le détail.</Text>
      ) : null}
    </View>
  );
}
