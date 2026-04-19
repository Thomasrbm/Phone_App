import { useFocusEffect, useRouter } from 'expo-router';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalendarMonth from '@/components/CalendarMonth';
import { getTaskCountsInRange, type DayCounts } from '@/db/tasks';
import { toDayKey } from '@/lib/date';
import { theme } from '@/lib/theme';

const MONTHS_BEFORE = 12;
const MONTHS_AFTER = 12;
const WEEKDAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

export default function CalendarScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Date>>(null);

  const today = useMemo(() => new Date(), []);
  const months = useMemo(() => {
    const out: Date[] = [];
    for (let i = -MONTHS_BEFORE; i <= MONTHS_AFTER; i++) {
      out.push(addMonths(today, i));
    }
    return out;
  }, [today]);
  const initialIndex = MONTHS_BEFORE;

  const [visibleMonth, setVisibleMonth] = useState<Date>(today);
  const [counts, setCounts] = useState<Record<string, DayCounts>>({});

  const range = useMemo(() => {
    const start = startOfWeek(startOfMonth(months[0]), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(months[months.length - 1]), {
      weekStartsOn: 1,
    });
    return { start: toDayKey(start), end: toDayKey(end) };
  }, [months]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getTaskCountsInRange(range.start, range.end).then((data) => {
        if (!cancelled) setCounts(data);
      });
      return () => {
        cancelled = true;
      };
    }, [range])
  );

  const handleDayPress = (date: Date) => {
    router.push(`/calendar/${toDayKey(date)}`);
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    const m = months[idx];
    if (m && !isSameMonth(m, visibleMonth)) setVisibleMonth(m);
  };

  const goToToday = () => {
    listRef.current?.scrollToIndex({ index: initialIndex, animated: true });
  };

  const goToPrev = () => {
    const idx = months.findIndex((m) => isSameMonth(m, visibleMonth));
    if (idx > 0)
      listRef.current?.scrollToIndex({ index: idx - 1, animated: true });
  };

  const goToNext = () => {
    const idx = months.findIndex((m) => isSameMonth(m, visibleMonth));
    if (idx < months.length - 1)
      listRef.current?.scrollToIndex({ index: idx + 1, animated: true });
  };

  const monthLabel = format(visibleMonth, 'MMMM yyyy', { locale: fr });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.todayRow}>
        <TouchableOpacity
          onPress={goToToday}
          style={styles.todayBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.todayBtnText}>{today.getDate()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrev} style={styles.navBtn} hitSlop={8}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </Text>
        <TouchableOpacity onPress={goToNext} style={styles.navBtn} hitSlop={8}>
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

      <FlatList
        ref={listRef}
        data={months}
        keyExtractor={(d) => toDayKey(d)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        removeClippedSubviews
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item }) => (
          <CalendarMonth
            month={item}
            counts={counts}
            onDayPress={handleDayPress}
            width={width}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  todayRow: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  todayBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.today,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtnText: {
    color: theme.colors.today,
    fontSize: theme.font.md,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 26,
    color: theme.colors.textMuted,
    lineHeight: 28,
  },
  monthLabel: {
    fontSize: theme.font.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  weekdayRow: {
    flexDirection: 'row',
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
});
