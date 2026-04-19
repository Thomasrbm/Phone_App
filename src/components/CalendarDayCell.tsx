import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '@/lib/theme';
import type { DayCounts } from '@/db/tasks';

type Props = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  counts: DayCounts | undefined;
  onPress: () => void;
};

export default function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  counts,
  onPress,
}: Props) {
  const allDone = counts !== undefined && counts.done === counts.total && counts.total > 0;

  return (
    <TouchableOpacity onPress={onPress} style={styles.cell} activeOpacity={0.6}>
      <View style={[styles.inner, isToday && styles.todayBg]}>
        <Text
          style={[
            styles.dayNumber,
            !isCurrentMonth && styles.mutedText,
            isToday && styles.todayText,
          ]}
        >
          {date.getDate()}
        </Text>
        {counts ? (
          <Text
            style={[
              styles.counts,
              allDone && styles.countsDone,
              isToday && styles.todayText,
            ]}
          >
            {counts.done}/{counts.total}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
  todayBg: {
    backgroundColor: theme.colors.today,
  },
  dayNumber: {
    fontSize: theme.font.lg,
    color: theme.colors.text,
    fontWeight: '500',
  },
  mutedText: {
    color: theme.colors.textMuted,
  },
  todayText: {
    color: theme.colors.textInverse,
  },
  counts: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  countsDone: {
    color: theme.colors.done,
    fontWeight: '600',
  },
});
