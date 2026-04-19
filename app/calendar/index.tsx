import { useFocusEffect, useRouter } from 'expo-router';
import {
  addMonths,
  addWeeks,
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameWeek,
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
import CalendarWeek from '@/components/CalendarWeek';
import TodayButton from '@/components/TodayButton';
import ViewMenu, { type CalendarView } from '@/components/ViewMenu';
import { getTaskCountsInRange, type DayCounts } from '@/db/tasks';
import { toDayKey } from '@/lib/date';
import { theme } from '@/lib/theme';

const PAGES_BEFORE = 12;
const PAGES_AFTER = 12;
const WEEKDAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

export default function CalendarScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const monthListRef = useRef<FlatList<Date>>(null);
  const weekListRef = useRef<FlatList<Date>>(null);

  const today = useMemo(() => new Date(), []);

  const months = useMemo(() => {
    const out: Date[] = [];
    for (let i = -PAGES_BEFORE; i <= PAGES_AFTER; i++) {
      out.push(addMonths(today, i));
    }
    return out;
  }, [today]);

  const weeks = useMemo(() => {
    const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let i = -PAGES_BEFORE; i <= PAGES_AFTER; i++) {
      out.push(addWeeks(todayWeekStart, i));
    }
    return out;
  }, [today]);

  const initialIndex = PAGES_BEFORE;

  const [view, setView] = useState<CalendarView>('month');
  const [menuOpen, setMenuOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(today);
  const [visibleWeek, setVisibleWeek] = useState<Date>(
    startOfWeek(today, { weekStartsOn: 1 })
  );
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

  const handleMonthScrollEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    const m = months[idx];
    if (m && !isSameMonth(m, visibleMonth)) setVisibleMonth(m);
  };

  const handleWeekScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    const w = weeks[idx];
    if (w && !isSameWeek(w, visibleWeek, { weekStartsOn: 1 })) {
      setVisibleWeek(w);
    }
  };

  const goToToday = () => {
    if (view === 'month') {
      monthListRef.current?.scrollToIndex({
        index: initialIndex,
        animated: true,
      });
    } else {
      weekListRef.current?.scrollToIndex({
        index: initialIndex,
        animated: true,
      });
    }
  };

  const goToPrev = () => {
    if (view === 'month') {
      const idx = months.findIndex((m) => isSameMonth(m, visibleMonth));
      if (idx > 0)
        monthListRef.current?.scrollToIndex({
          index: idx - 1,
          animated: true,
        });
    } else {
      const idx = weeks.findIndex((w) =>
        isSameWeek(w, visibleWeek, { weekStartsOn: 1 })
      );
      if (idx > 0)
        weekListRef.current?.scrollToIndex({ index: idx - 1, animated: true });
    }
  };

  const goToNext = () => {
    if (view === 'month') {
      const idx = months.findIndex((m) => isSameMonth(m, visibleMonth));
      if (idx < months.length - 1)
        monthListRef.current?.scrollToIndex({
          index: idx + 1,
          animated: true,
        });
    } else {
      const idx = weeks.findIndex((w) =>
        isSameWeek(w, visibleWeek, { weekStartsOn: 1 })
      );
      if (idx < weeks.length - 1)
        weekListRef.current?.scrollToIndex({ index: idx + 1, animated: true });
    }
  };

  const headerLabel =
    view === 'month'
      ? capitalize(format(visibleMonth, 'MMMM yyyy', { locale: fr }))
      : `${format(visibleWeek, 'd MMM', { locale: fr })} – ${format(
          addDays(visibleWeek, 6),
          'd MMM yyyy',
          { locale: fr }
        )}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          style={styles.menuBtn}
          hitSlop={8}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <View style={styles.todayCenter}>
          <TodayButton day={today.getDate()} onPress={goToToday} />
        </View>

        <TouchableOpacity
          onPress={() => router.push('/search')}
          style={styles.menuBtn}
          hitSlop={8}
        >
          <Text style={styles.menuIcon}>⌕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrev} style={styles.navBtn} hitSlop={8}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{headerLabel}</Text>
        <TouchableOpacity onPress={goToNext} style={styles.navBtn} hitSlop={8}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      {view === 'month' ? (
        <>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={styles.weekdayLabel}>
                {w}
              </Text>
            ))}
          </View>
          <FlatList
            ref={monthListRef}
            data={months}
            keyExtractor={(d) => `m-${toDayKey(d)}`}
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
            onMomentumScrollEnd={handleMonthScrollEnd}
            renderItem={({ item }) => (
              <CalendarMonth
                month={item}
                counts={counts}
                onDayPress={handleDayPress}
                width={width}
              />
            )}
          />
        </>
      ) : (
        <FlatList
          ref={weekListRef}
          data={weeks}
          keyExtractor={(d) => `w-${toDayKey(d)}`}
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
          onMomentumScrollEnd={handleWeekScrollEnd}
          renderItem={({ item }) => (
            <CalendarWeek
              weekStart={item}
              counts={counts}
              onDayPress={handleDayPress}
              width={width}
            />
          )}
        />
      )}

      <ViewMenu
        visible={menuOpen}
        current={view}
        onSelect={setView}
        onClose={() => setMenuOpen(false)}
      />
    </SafeAreaView>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: theme.colors.text,
  },
  todayCenter: {
    flex: 1,
    alignItems: 'center',
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
