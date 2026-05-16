import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/lib/themeContext';

type Props = {
  todayKey: string; // 'YYYY-MM-DD'
  completedDays: Set<string>;
  color: string;
};

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Compact one-line view of the current week (Mon→Sun) for a routine.
// `todayKey` anchors the week — the row spans the Monday-rooted week
// containing today.
export default function RoutineWeekStrip({
  todayKey,
  completedDays,
  color,
}: Props) {
  const { theme } = useTheme();

  const days = useMemo(() => {
    const t = new Date(todayKey + 'T00:00:00');
    const jsDow = t.getDay();
    const back = (jsDow + 6) % 7;
    const monday = new Date(t);
    monday.setDate(monday.getDate() - back);
    const out: { key: string; isToday: boolean; isFuture: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = toKey(d);
      out.push({
        key,
        isToday: key === todayKey,
        isFuture: key > todayKey,
      });
    }
    return out;
  }, [todayKey]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginTop: theme.spacing.sm,
        },
        header: {
          flexDirection: 'row',
          marginBottom: 4,
        },
        headerCell: {
          flex: 1,
          textAlign: 'center',
          fontSize: 9,
          color: theme.colors.textSubtle,
          fontWeight: '700',
        },
        row: {
          flexDirection: 'row',
        },
        cell: {
          flex: 1,
          aspectRatio: 1,
          padding: 2,
        },
        cellInner: {
          flex: 1,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: 'transparent',
        },
        cellDone: {
          borderColor: 'transparent',
        },
        cellToday: {
          borderColor: theme.colors.today,
          borderWidth: 2,
        },
        cellFuture: {
          opacity: 0.35,
        },
      }),
    [theme]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.headerCell}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.row}>
        {days.map((d) => {
          const done = completedDays.has(d.key);
          return (
            <View key={d.key} style={styles.cell}>
              <View
                style={[
                  styles.cellInner,
                  done && styles.cellDone,
                  done && { backgroundColor: color },
                  d.isToday && styles.cellToday,
                  d.isFuture && styles.cellFuture,
                ]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
