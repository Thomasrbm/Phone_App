import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import CalendarScreen from './calendar';
import DayScreen from './calendar/[date]';
import RoutinesScreen from './routines';
import { toDayKey } from '@/lib/date';

// Hub keeps all three sibling views mounted at all times. The encoches
// (DragHandle swipes) and intra-screen taps that used to trigger
// router.push/replace between /calendar, /calendar/[date] and /routines
// now flip the activeView state — instant, no remount.
//
// Lazy-mount strategy: only the day view boots on startup (the user's
// landing screen). Month + routines mount the first time they are
// activated, then stay alive. App start stays as cheap as before, but
// every transition after the first is free.

type ActiveView = 'month' | 'day' | 'routines';

export default function Hub() {
  const [view, setView] = useState<ActiveView>('day');
  const [date, setDate] = useState<string>(() => toDayKey(new Date()));
  const [mounted, setMounted] = useState<Set<ActiveView>>(
    () => new Set(['day'])
  );
  // The month view refetches its per-day counts only when the user
  // actually switches to it AND there has been at least one mutation
  // since the last refetch. Firing on every toggle would re-run a
  // ~25-month SQL aggregate per check, which lags the day screen.
  const [tasksVersion, setTasksVersion] = useState(0);
  const tasksDirty = useRef(false);
  const markTasksDirty = useCallback(() => {
    tasksDirty.current = true;
  }, []);
  const flushTasksDirty = useCallback(() => {
    if (tasksDirty.current) {
      tasksDirty.current = false;
      setTasksVersion((v) => v + 1);
    }
  }, []);
  // Routines structure changes (group/routine create/delete/rename/archive)
  // need to reach the day view immediately. Unlike tasksVersion (lazy:
  // flushed when month becomes active), this is bumped synchronously
  // because the day view is the consumer and is typically visible right
  // after the user finishes editing on the routines screen.
  const [routinesVersion, setRoutinesVersion] = useState(0);
  const bumpRoutines = useCallback(() => {
    setRoutinesVersion((v) => v + 1);
  }, []);

  const ensureMounted = useCallback((v: ActiveView) => {
    setMounted((prev) => {
      if (prev.has(v)) return prev;
      const next = new Set(prev);
      next.add(v);
      return next;
    });
  }, []);

  const goToMonth = useCallback(() => {
    ensureMounted('month');
    setView('month');
    flushTasksDirty();
  }, [ensureMounted, flushTasksDirty]);

  const goToDay = useCallback(
    (d?: string) => {
      if (d) setDate(d);
      setView('day');
    },
    []
  );

  const goToRoutines = useCallback(() => {
    ensureMounted('routines');
    setView('routines');
  }, [ensureMounted]);

  const goToToday = useCallback(() => {
    setDate(toDayKey(new Date()));
    setView('day');
  }, []);

  // POLISH:hub-crossfade — quick 80 ms crossfade between hub views so
  // the switch reads softer than a hard cut without reintroducing the
  // perceived nav latency.
  const monthOpacity = useSharedValue(view === 'month' ? 1 : 0);
  const dayOpacity = useSharedValue(view === 'day' ? 1 : 0);
  const routinesOpacity = useSharedValue(view === 'routines' ? 1 : 0);
  useEffect(() => {
    monthOpacity.value = withTiming(view === 'month' ? 1 : 0, {
      duration: 80,
    });
    dayOpacity.value = withTiming(view === 'day' ? 1 : 0, { duration: 80 });
    routinesOpacity.value = withTiming(view === 'routines' ? 1 : 0, {
      duration: 80,
    });
  }, [view, monthOpacity, dayOpacity, routinesOpacity]);
  const monthAnim = useAnimatedStyle(() => ({ opacity: monthOpacity.value }));
  const dayAnim = useAnimatedStyle(() => ({ opacity: dayOpacity.value }));
  const routinesAnim = useAnimatedStyle(() => ({
    opacity: routinesOpacity.value,
  }));
  // /POLISH:hub-crossfade

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, animation: 'none' }} />

      <Animated.View
        style={[
          styles.layer,
          view === 'month' ? styles.zVisible : styles.zHidden,
          monthAnim,
        ]}
        pointerEvents={view === 'month' ? 'auto' : 'none'}
      >
        {mounted.has('month') ? (
          <CalendarScreen
            hubMode
            onSelectDay={(d) => goToDay(d)}
            onSwipeUp={goToToday}
            tasksVersion={tasksVersion}
          />
        ) : null}
      </Animated.View>

      <Animated.View
        style={[
          styles.layer,
          view === 'day' ? styles.zVisible : styles.zHidden,
          dayAnim,
        ]}
        pointerEvents={view === 'day' ? 'auto' : 'none'}
      >
        <DayScreen
          hubMode
          date={date}
          onChangeDate={setDate}
          onSwipeUp={goToMonth}
          onOpenRoutines={goToRoutines}
          onTasksChanged={markTasksDirty}
          routinesVersion={routinesVersion}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.layer,
          view === 'routines' ? styles.zVisible : styles.zHidden,
          routinesAnim,
        ]}
        pointerEvents={view === 'routines' ? 'auto' : 'none'}
      >
        {mounted.has('routines') ? (
          <RoutinesScreen
            hubMode
            onSwipeUp={() => goToDay()}
            onRoutinesChanged={bumpRoutines}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // POLISH:hub-crossfade — opacity is now driven by reanimated shared
  // values (monthAnim/dayAnim/routinesAnim). The zIndex toggle stays
  // static so the active layer stays on top during the fade.
  zVisible: {
    zIndex: 1,
  },
  zHidden: {
    zIndex: 0,
  },
});
