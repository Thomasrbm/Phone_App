import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/lib/themeContext';

type Props = {
  year: number;
  month: number; // 0-11
  completedDays: Set<string>; // 'YYYY-MM-DD'
  color: string; // routine color or theme.colors.routine
  todayKey: string;
};

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Calendar grid for one month. Mon-Sun rows. Completed days are filled
// with `color`, others show an empty outline. Today gets an inner ring.
export default function RoutineMonthHeatmap({
  year,
  month,
  completedDays,
  color,
  todayKey,
}: Props) {
  const { theme } = useTheme();

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    // JS getDay(): 0=Sunday. We want Monday-first, so shift.
    const jsDow = firstDay.getDay();
    const lead = (jsDow + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = lead + daysInMonth;
    const rows = Math.ceil(total / 7);
    const list: ({ day: number; key: string } | null)[] = [];
    for (let i = 0; i < rows * 7; i++) {
      const dayIdx = i - lead + 1;
      if (dayIdx < 1 || dayIdx > daysInMonth) {
        list.push(null);
      } else {
        list.push({
          day: dayIdx,
          key: `${year}-${pad(month + 1)}-${pad(dayIdx)}`,
        });
      }
    }
    return list;
  }, [year, month]);

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
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
        },
        cell: {
          width: `${100 / 7}%`,
          aspectRatio: 1,
          padding: 2,
        },
        cellInner: {
          flex: 1,
          borderRadius: 4,
          borderWidth: 1,
          backgroundColor: 'transparent',
        },
        cellDone: {
          borderColor: 'transparent',
        },
        cellToday: {
          borderColor: theme.colors.today,
          borderWidth: 2,
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
      <View style={styles.grid}>
        {cells.map((c, i) => {
          if (!c) {
            return <View key={i} style={styles.cell} />;
          }
          const done = completedDays.has(c.key);
          const isToday = c.key === todayKey;
          // Empty cells tint their border with the routine color at low
          // alpha so they read as "spots reserved for this routine"
          // instead of disappearing into the background.
          const emptyBorder =
            color.length === 7 && color.startsWith('#')
              ? `${color}66`
              : theme.colors.textSubtle;
          return (
            <View key={i} style={styles.cell}>
              <View
                style={[
                  styles.cellInner,
                  { borderColor: emptyBorder },
                  done && styles.cellDone,
                  done && { backgroundColor: color },
                  isToday && styles.cellToday,
                ]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
