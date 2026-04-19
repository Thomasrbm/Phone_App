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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { theme } from '@/lib/theme';
import type { DayCounts } from '@/db/tasks';
import { toDayKey } from '@/lib/date';
import CalendarDayCell from './CalendarDayCell';

const WEEKDAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
const SWIPE_THRESHOLD = 60;

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

  const rows: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }

  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) onPrevMonth();
      else if (e.translationX < -SWIPE_THRESHOLD) onNextMonth();
    })
    .runOnJS(true);

  const monthLabel = format(month, 'MMMM yyyy', { locale: fr });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.monthLabel}>
          {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </Text>
        <View style={styles.navGroup}>
          <TouchableOpacity onPress={onPrevMonth} style={styles.navBtn}>
            <Text style={styles.navText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onNextMonth} style={styles.navBtn}>
            <Text style={styles.navText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {w}
          </Text>
        ))}
      </View>

      <GestureDetector gesture={swipe}>
        <View style={styles.grid}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
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
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  monthLabel: {
    fontSize: theme.font.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  navGroup: {
    flexDirection: 'row',
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.xs,
  },
  navText: {
    fontSize: 26,
    color: theme.colors.textMuted,
    fontWeight: '400',
    lineHeight: 28,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.font.xs,
    color: theme.colors.textSubtle,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: theme.spacing.sm,
  },
  grid: {
    flex: 1,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    borderRightWidth: 0,
  },
});
