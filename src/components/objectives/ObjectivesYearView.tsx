import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ObjectiveHorizon } from '@/db/objectives';
import { toDayKey } from '@/lib/date';
import { useTheme } from '@/lib/themeContext';

type Props = {
  // Year to display. Caller controls navigation (typically driven by
  // the decade strip above).
  year: number;
  // Map from 'YYYY-MM-DD' to the most-urgent horizon that has a
  // deadline on that day. Long takes precedence over medium, medium
  // over short — long terme is the visual "loud" signal.
  deadlinesByDay: Map<string, ObjectiveHorizon>;
  // Tap on a day cell that has at least one deadline. Caller decides
  // what to do (e.g. open the first matching objective).
  onSelectDay?: (dayKey: string) => void;
};

const MONTH_LABELS = [
  'Janv', 'Févr', 'Mars', 'Avr',
  'Mai', 'Juin', 'Juil', 'Août',
  'Sept', 'Oct', 'Nov', 'Déc',
];

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Compact "year-at-a-glance" calendar. 12 mini month grids in 3 columns
// × 4 rows. Each day cell is filled with its horizon's accent colour
// if a deadline lands there.
//
// Today gets a distinct marker: a small white dot centered in the
// cell. The dot is always visible — whether the day is empty (sits
// against the gray cell bg) or has a deadline (sits against the
// horizon colour). The dot has a thin contrasting outline so it
// reads on every background. The point is: the user must be able to
// see "you are here" at a glance, separately from "there's a
// deadline here".
export default function ObjectivesYearView({
  year,
  deadlinesByDay,
  onSelectDay,
}: Props) {
  const { theme } = useTheme();

  const today = useMemo(() => {
    const t = new Date();
    return { key: toDayKey(t), year: t.getFullYear() };
  }, []);

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
        yearHeader: {
          fontSize: theme.font.lg,
          fontWeight: '700',
          color: theme.colors.text,
          textAlign: 'center',
          marginBottom: theme.spacing.md,
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
        },
        monthBox: {
          width: '33.333%',
          padding: theme.spacing.xs,
        },
        monthTitle: {
          fontSize: theme.font.xs,
          fontWeight: '700',
          color: theme.colors.textMuted,
          marginBottom: 2,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          textAlign: 'center',
        },
        weekdaysRow: {
          flexDirection: 'row',
        },
        weekdayCell: {
          flex: 1,
          textAlign: 'center',
          fontSize: 7,
          color: theme.colors.textSubtle,
          fontWeight: '700',
        },
        weekRow: {
          flexDirection: 'row',
        },
        dayCell: {
          flex: 1,
          aspectRatio: 1,
          padding: 0.5,
        },
        dayCellInner: {
          flex: 1,
          borderRadius: 2,
          backgroundColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        },
        // Today marker: small filled dot, white inside with a thin
        // dark outline so it reads on every cell background.
        todayDot: {
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: theme.colors.surface,
          borderWidth: 0.5,
          borderColor: theme.colors.text,
        },
        legend: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: theme.spacing.md,
          marginTop: theme.spacing.md,
        },
        legendItem: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        legendSwatch: {
          width: 10,
          height: 10,
          borderRadius: 2,
        },
        legendText: {
          fontSize: theme.font.xs,
          color: theme.colors.textMuted,
        },
      }),
    [theme]
  );

  const horizonColor = (h: ObjectiveHorizon): string => {
    if (h === 'long') return theme.colors.objectiveLong;
    if (h === 'medium') return theme.colors.objectiveMedium;
    return theme.colors.objectiveShort;
  };

  // Render one mini-month: 6 rows × 7 cols grid, Monday-first. Empty
  // leading/trailing cells are blank (no day number, no background).
  const renderMonth = (monthIdx: number) => {
    const firstDay = new Date(year, monthIdx, 1);
    const jsDow = firstDay.getDay();
    const lead = (jsDow + 6) % 7; // shift to Mon-first
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const total = lead + daysInMonth;
    const rowCount = Math.ceil(total / 7);
    const cells: ({ dayKey: string; horizon: ObjectiveHorizon | null; isToday: boolean } | null)[] = [];
    for (let i = 0; i < rowCount * 7; i++) {
      const dayIdx = i - lead + 1;
      if (dayIdx < 1 || dayIdx > daysInMonth) {
        cells.push(null);
      } else {
        const d = new Date(year, monthIdx, dayIdx);
        const dayKey = toDayKey(d);
        cells.push({
          dayKey,
          horizon: deadlinesByDay.get(dayKey) ?? null,
          isToday: year === today.year && dayKey === today.key,
        });
      }
    }
    const rows: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }

    return (
      <View key={monthIdx} style={styles.monthBox}>
        <Text style={styles.monthTitle}>{MONTH_LABELS[monthIdx]}</Text>
        <View style={styles.weekdaysRow}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} style={styles.weekdayCell}>
              {d}
            </Text>
          ))}
        </View>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.weekRow}>
            {row.map((c, colIdx) => {
              if (!c) {
                return <View key={colIdx} style={styles.dayCell} />;
              }
              const inner = (
                <View
                  style={[
                    styles.dayCellInner,
                    c.horizon !== null && {
                      backgroundColor: horizonColor(c.horizon),
                    },
                  ]}
                >
                  {c.isToday ? <View style={styles.todayDot} /> : null}
                </View>
              );
              if (c.horizon !== null && onSelectDay) {
                return (
                  <TouchableOpacity
                    key={colIdx}
                    style={styles.dayCell}
                    onPress={() => onSelectDay(c.dayKey)}
                    activeOpacity={0.6}
                  >
                    {inner}
                  </TouchableOpacity>
                );
              }
              return (
                <View key={colIdx} style={styles.dayCell}>
                  {inner}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.yearHeader}>{year}</Text>
      <View style={styles.grid}>
        {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              { backgroundColor: theme.colors.objectiveLong },
            ]}
          />
          <Text style={styles.legendText}>Long</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              { backgroundColor: theme.colors.objectiveMedium },
            ]}
          />
          <Text style={styles.legendText}>Moyen</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              { backgroundColor: theme.colors.objectiveShort },
            ]}
          />
          <Text style={styles.legendText}>Court</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.todayDot} />
          <Text style={styles.legendText}>Aujourd&apos;hui</Text>
        </View>
      </View>
    </View>
  );
}
