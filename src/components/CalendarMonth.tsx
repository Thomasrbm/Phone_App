import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday as isDateToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '@/lib/theme';
import type { DayCounts } from '@/db/tasks';
import { toDayKey } from '@/lib/date';
import CalendarDayCell from './CalendarDayCell';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type Props = {
  month: Date;
  counts: Record<string, DayCounts>;
  onDayPress: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

export default function CalendarMonth({
  month,
  counts,
  onDayPress,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={onPrevMonth} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {format(month, 'MMMM yyyy', { locale: fr })}
        </Text>
        <TouchableOpacity onPress={onNextMonth} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((d) => {
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
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  navText: {
    fontSize: theme.font.xl,
    color: theme.colors.text,
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: theme.font.xl,
    fontWeight: '700',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    marginBottom: theme.spacing.xs,
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
