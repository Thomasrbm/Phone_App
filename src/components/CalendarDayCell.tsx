import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/lib/themeContext';
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
  const { theme } = useTheme();
  const allDone =
    counts !== undefined && counts.total > 0 && counts.done === counts.total;
  const hasPending =
    counts !== undefined && counts.total > 0 && counts.done < counts.total;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cell: {
          flex: 1,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.borderSubtle,
          paddingHorizontal: 4,
          paddingTop: 4,
          paddingBottom: 6,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'flex-start',
        },
        dayNumber: {
          fontSize: theme.font.md,
          color: theme.colors.text,
          fontWeight: '500',
        },
        mutedText: {
          color: theme.colors.textSubtle,
        },
        todayCircle: {
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: theme.colors.today,
          alignItems: 'center',
          justifyContent: 'center',
        },
        todayText: {
          color: theme.colors.textInverse,
          fontWeight: '700',
        },
        pill: {
          alignSelf: 'flex-start',
          marginTop: 'auto',
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.surfaceAlt,
        },
        pillDone: {
          backgroundColor: theme.colors.doneSoft,
        },
        pillPending: {
          backgroundColor: theme.colors.pendingSoft,
        },
        pillText: {
          fontSize: theme.font.xs,
          color: theme.colors.textMuted,
          fontWeight: '600',
        },
        pillTextDone: {
          color: theme.colors.done,
        },
        pillTextPending: {
          color: theme.colors.pending,
        },
      }),
    [theme]
  );

  return (
    <TouchableOpacity onPress={onPress} style={styles.cell} activeOpacity={0.5}>
      <View style={styles.header}>
        <View style={isToday ? styles.todayCircle : null}>
          <Text
            style={[
              styles.dayNumber,
              !isCurrentMonth && styles.mutedText,
              isToday && styles.todayText,
            ]}
          >
            {date.getDate()}
          </Text>
        </View>
      </View>
      {counts ? (
        <View
          style={[
            styles.pill,
            allDone && styles.pillDone,
            hasPending && styles.pillPending,
          ]}
        >
          <Text
            style={[
              styles.pillText,
              allDone && styles.pillTextDone,
              hasPending && styles.pillTextPending,
            ]}
          >
            {counts.done}/{counts.total}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
