import { useFocusEffect, useRouter } from 'expo-router';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useCallback, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import CalendarMonth from '@/components/CalendarMonth';
import { getTaskCountsInRange, type DayCounts } from '@/db/tasks';
import { toDayKey } from '@/lib/date';
import { theme } from '@/lib/theme';

export default function CalendarScreen() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [counts, setCounts] = useState<Record<string, DayCounts>>({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const gridStart = startOfWeek(startOfMonth(currentMonth), {
        weekStartsOn: 1,
      });
      const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
      getTaskCountsInRange(toDayKey(gridStart), toDayKey(gridEnd)).then(
        (data) => {
          if (!cancelled) setCounts(data);
        }
      );
      return () => {
        cancelled = true;
      };
    }, [currentMonth])
  );

  const handleDayPress = (date: Date) => {
    router.push(`/calendar/${toDayKey(date)}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CalendarMonth
        month={currentMonth}
        counts={counts}
        onDayPress={handleDayPress}
        onPrevMonth={() => setCurrentMonth((m) => subMonths(m, 1))}
        onNextMonth={() => setCurrentMonth((m) => addMonths(m, 1))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
