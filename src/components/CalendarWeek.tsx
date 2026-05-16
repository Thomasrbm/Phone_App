import {
  addDays,
  eachDayOfInterval,
  format,
  isToday as isDateToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/lib/themeContext';
import type { DayCounts } from '@/db/tasks';
import { toDayKey } from '@/lib/date';

type Props = {
  weekStart: Date;
  counts: Record<string, DayCounts>;
  onDayPress: (date: Date) => void;
  width: number;
};

export default function CalendarWeek({
  weekStart,
  counts,
  onDayPress,
  width,
}: Props) {
  const { theme } = useTheme();
  const days = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        row: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.borderSubtle,
        },
        dateCol: {
          width: 56,
          alignItems: 'center',
        },
        weekdayName: {
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 4,
        },
        dayNumber: {
          fontSize: theme.font.xl,
          color: theme.colors.text,
          fontWeight: '600',
        },
        todayText: {
          color: theme.colors.today,
        },
        todayCircle: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.today,
          alignItems: 'center',
          justifyContent: 'center',
        },
        todayNumberText: {
          color: theme.colors.textInverse,
          fontWeight: '700',
        },
        contentCol: {
          flex: 1,
          paddingLeft: theme.spacing.lg,
        },
        taskInfo: {
          fontSize: theme.font.md,
          color: theme.colors.text,
          fontWeight: '500',
        },
        taskInfoDone: {
          color: theme.colors.done,
        },
        taskMuted: {
          fontSize: theme.font.md,
          color: theme.colors.textSubtle,
        },
      }),
    [theme]
  );

  return (
    <View style={[styles.container, { width }]}>
      {days.map((d) => {
        const key = toDayKey(d);
        const c = counts[key];
        const today = isDateToday(d);
        const allDone = c !== undefined && c.total > 0 && c.done === c.total;

        return (
          <TouchableOpacity
            key={key}
            style={styles.row}
            onPress={() => onDayPress(d)}
            activeOpacity={0.6}
          >
            <View style={styles.dateCol}>
              <Text style={[styles.weekdayName, today && styles.todayText]}>
                {format(d, 'EEE', { locale: fr })}
              </Text>
              <View style={today ? styles.todayCircle : null}>
                <Text
                  style={[
                    styles.dayNumber,
                    today && styles.todayNumberText,
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
            </View>

            <View style={styles.contentCol}>
              {c ? (
                <Text
                  style={[
                    styles.taskInfo,
                    allDone && styles.taskInfoDone,
                  ]}
                >
                  {c.done}/{c.total} tâche{c.total > 1 ? 's' : ''}
                  {allDone ? ' ✓' : ''}
                </Text>
              ) : (
                <Text style={styles.taskMuted}>—</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
