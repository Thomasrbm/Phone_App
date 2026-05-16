import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  isToday as isDateToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/lib/themeContext';
import type { DayCounts } from '@/db/tasks';
import { toDayKey } from '@/lib/date';
import CalendarDayCell from './CalendarDayCell';

type Props = {
  month: Date;
  counts: Record<string, DayCounts>;
  onDayPress: (date: Date) => void;
  width: number;
};

export default function CalendarMonth({
  month,
  counts,
  onDayPress,
  width,
}: Props) {
  const { theme } = useTheme();
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const rows: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        grid: {
          flex: 1,
        },
        row: {
          flex: 1,
          flexDirection: 'row',
        },
        currentWeekRow: {
          backgroundColor: theme.colors.surfaceAlt,
        },
      }),
    [theme]
  );

  return (
    <View style={[styles.grid, { width }]}>
      {rows.map((row, rowIdx) => {
        const isCurrentWeek = row.some((d) => isDateToday(d));
        return (
          <View
            key={rowIdx}
            style={[styles.row, isCurrentWeek && styles.currentWeekRow]}
          >
            {row.map((d) => {
              const key = toDayKey(d);
              return (
                <CalendarDayCell
                  key={key}
                  date={d}
                  isCurrentMonth={isSameMonth(d, month)}
                  isToday={isDateToday(d)}
                  counts={counts[key]}
                  onPress={() => onDayPress(d)}
                />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
