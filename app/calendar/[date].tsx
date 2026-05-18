import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { addDays, parseISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import PagerView, {
  type PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view';
import DayContent from '@/components/DayContent';
import FarJumpOverlay from '@/components/FarJumpOverlay';
import { EMPTY_STRUCTURE, routineStructureView } from '@/data/views';
import { useActiveGroupId } from '@/hooks/useActiveGroupId';
import { toDayKey } from '@/lib/date';
import { useTheme } from '@/lib/themeContext';

// Fixed window of dates anchored on the initial URL date. The native
// pager scrolls within this list, but only the pages near the active
// index actually mount a <DayContent> (and therefore fire SQL fetches).
// ±30 days is plenty for typical navigation; beyond that the user can
// jump via /calendar.
const PAGES_AROUND = 30;
// Lazy-mount radius. Only DayContents within ±RENDER_HALF of the
// active index are materialised — the rest stay as cheap empty Views.
// 5 = current + 5 neighbours each side, so a tap on any nearby day in
// the month view lands on a pre-mounted page (no fresh mount cost +
// no SQL round-trip on the critical path).
const RENDER_HALF = 5;

type DayScreenProps = {
  // Hub mode props: when provided, the component takes its date from
  // these instead of route params and routes navigation through callbacks
  // instead of router.push. Used by the always-mounted hub at /.
  hubMode?: boolean;
  date?: string;
  onChangeDate?: (date: string) => void;
  onSwipeUp?: () => void;
  onOpenRoutines?: () => void;
};

export default function DayScreen({
  hubMode,
  date: dateProp,
  onChangeDate,
  onSwipeUp,
  onOpenRoutines,
}: DayScreenProps = {}) {
  const { theme } = useTheme();
  const routeParams = useLocalSearchParams<{ date: string }>();
  const date = dateProp ?? routeParams.date;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<PagerView>(null);
  const isInternalNav = useRef(false);

  // Routines structure (groups + routines-per-group) is shared across
  // every mounted DayContent. The view layer caches the result so
  // re-entry is instant; invalidation fires automatically whenever a
  // mutation runs through @/data/mutations.
  const structure = routineStructureView.useView('_', EMPTY_STRUCTURE);
  const { groups, routinesByGroup } = structure;

  const [activeGroupId, handleSelectGroup] = useActiveGroupId(groups);

  // The ±30 day pager window is anchored on a date. In standalone-route
  // mode this anchor never changes (the screen remounts when navigating
  // to a different day). In hub mode the screen stays mounted, so when
  // the user picks a far-away day from the month view we re-anchor.
  const [windowAnchor, setWindowAnchor] = useState(date);
  const windowDates = useMemo<string[]>(() => {
    const base = parseISO(windowAnchor);
    const out: string[] = [];
    for (let i = -PAGES_AROUND; i <= PAGES_AROUND; i++) {
      out.push(toDayKey(addDays(base, i)));
    }
    return out;
  }, [windowAnchor]);

  const initialIndex = useMemo(() => {
    const i = windowDates.indexOf(date);
    return i >= 0 ? i : PAGES_AROUND;
  }, [windowDates, date]);

  const [activeIdx, setActiveIdx] = useState(initialIndex);

  // Far-jump overlay: when target date is outside the current pager
  // window, we re-anchor (which can't be animated since DayContents
  // mount/unmount) and slide a lightweight "fake page" overlay across
  // to give the user the visual sensation of a swipe. The real new
  // DayContent mounts under the overlay, ready when the slide ends.
  const [farJump, setFarJump] = useState<null | {
    toDate: string;
    direction: 'right' | 'left';
  }>(null);
  const prevDateRef = useRef(date);
  const farJumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (farJumpTimerRef.current) clearTimeout(farJumpTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isInternalNav.current) {
      isInternalNav.current = false;
      prevDateRef.current = date;
      return;
    }
    const i = windowDates.indexOf(date);
    if (i >= 0) {
      // Within window — instant snap, like Google Calendar.
      pagerRef.current?.setPageWithoutAnimation(i);
      setActiveIdx(i);
    } else {
      // Out of window — fake-page slide for visual continuity while we
      // re-anchor + mount the real DayContent underneath.
      const direction = date > prevDateRef.current ? 'right' : 'left';
      setFarJump({ toDate: date, direction });
      setWindowAnchor(date);
      setActiveIdx(PAGES_AROUND);
      if (farJumpTimerRef.current) clearTimeout(farJumpTimerRef.current);
      farJumpTimerRef.current = setTimeout(() => setFarJump(null), 260);
    }
    prevDateRef.current = date;
  }, [date, windowDates]);

  const onPageSelected = useCallback(
    (e: PagerViewOnPageSelectedEvent) => {
      const idx = e.nativeEvent.position;
      setActiveIdx(idx);
      const newDate = windowDates[idx];
      if (newDate && newDate !== date) {
        isInternalNav.current = true;
        if (onChangeDate) onChangeDate(newDate);
        else router.setParams({ date: newDate });
      }
    },
    [windowDates, date, router, onChangeDate]
  );

  // Animated day change: used by the chevrons + "Aujourd'hui" button.
  // Within-window jumps drive setPage (animated PagerView). Far jumps
  // fall back to the standard path so the useEffect above kicks in the
  // fake-page overlay — same visual treatment as a tap from the month.
  const changeDateAnimated = useCallback(
    (newDate: string) => {
      const i = windowDates.indexOf(newDate);
      if (i < 0) {
        if (onChangeDate) onChangeDate(newDate);
        else router.setParams({ date: newDate });
        return;
      }
      isInternalNav.current = true;
      pagerRef.current?.setPage(i);
      setActiveIdx(i);
      if (onChangeDate) onChangeDate(newDate);
      else router.setParams({ date: newDate });
    },
    [windowDates, router, onChangeDate]
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }}
    >
      {!hubMode ? (
        <Stack.Screen
          options={{
            headerShown: false,
            animation: 'none',
          }}
        />
      ) : null}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={initialIndex}
        offscreenPageLimit={2}
        onPageSelected={onPageSelected}
        scrollEnabled={false}
      >
        {windowDates.map((d, i) => (
          <View key={d} collapsable={false} style={{ flex: 1 }}>
            {Math.abs(i - activeIdx) <= RENDER_HALF ? (
              <DayContent
                date={d}
                width={width}
                groups={groups}
                activeGroupId={activeGroupId}
                routinesByGroup={routinesByGroup}
                onSelectGroup={handleSelectGroup}
                onSwipeUp={onSwipeUp}
                onOpenRoutines={onOpenRoutines}
                onChangeDate={onChangeDate}
                onChangeDateAnimated={changeDateAnimated}
              />
            ) : null}
          </View>
        ))}
      </PagerView>
      {farJump ? (
        <FarJumpOverlay key={farJump.toDate} farJump={farJump} />
      ) : null}
    </View>
  );
}
