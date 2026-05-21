import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/lib/themeContext';

type Props = {
  // Years (already deduplicated) where at least one *long-term*
  // objective has a non-done deadline. Only long-term shows on the
  // timeline — the medium/short layers stay implicit, surfaced in
  // the year detail view.
  longDeadlineYears: Set<number>;
  // Tap anywhere on the timeline opens the year picker.
  onTap: () => void;
};

// Spans we can render at once. Picked so the major ticks line up on
// round 5-year marks, the today marker stays roughly centered, and
// labels don't overlap on a phone screen.
const RANGE_PAST = 5;   // years before today
const RANGE_FUTURE = 25; // years after today (long-term framing)
const TOTAL_YEARS = RANGE_PAST + RANGE_FUTURE + 1; // inclusive
const MAJOR_TICK_EVERY = 5;

// Horizontal timeline: arrow line pointing right, major ticks every
// 5 years with labels, red dots above the line at each year that
// holds at least one long-term deadline, distinct marker for today.
// Whole strip is one big tap target → opens the year picker for
// precise selection (the timeline itself isn't a per-year scrubber,
// it's a visual scan of "what's coming").
export default function ObjectivesTimelineArrow({
  longDeadlineYears,
  onTap,
}: Props) {
  const { theme } = useTheme();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const startYear = currentYear - RANGE_PAST;
  const endYear = currentYear + RANGE_FUTURE;

  // Measure actual width so we can position absolutely without
  // pretending to know the screen size up front.
  const [innerWidth, setInnerWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    setInnerWidth(e.nativeEvent.layout.width);
  };

  // Each year takes 1/(TOTAL_YEARS-1) of the available width. The
  // first year sits at x=0, the last at x=width.
  const xForYear = (y: number) => {
    if (innerWidth === 0) return 0;
    return ((y - startYear) / (TOTAL_YEARS - 1)) * innerWidth;
  };

  // Build the list of major-tick years (rounded down to the nearest
  // multiple of 5 from startYear).
  const majorTicks = useMemo(() => {
    const out: number[] = [];
    const firstMajor =
      startYear + ((MAJOR_TICK_EVERY - (startYear % MAJOR_TICK_EVERY)) % MAJOR_TICK_EVERY);
    for (let y = firstMajor; y <= endYear; y += MAJOR_TICK_EVERY) {
      out.push(y);
    }
    return out;
  }, [startYear, endYear]);

  const deadlineYearsInRange = useMemo(() => {
    const out: number[] = [];
    for (const y of longDeadlineYears) {
      if (y >= startYear && y <= endYear) out.push(y);
    }
    return out;
  }, [longDeadlineYears, startYear, endYear]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.lg,
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceAlt,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.sm,
        },
        title: {
          fontSize: theme.font.xs,
          fontWeight: '700',
          color: theme.colors.textSubtle,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        rangeLabel: {
          fontSize: theme.font.xs,
          color: theme.colors.textMuted,
        },
        // Tappable surface that contains the timeline. Height fixed
        // so the absolute children have a known frame.
        timeline: {
          height: 80,
          position: 'relative',
        },
        // Horizontal line, vertically centered. The little arrow head
        // is a triangle drawn at the right edge with borders.
        line: {
          position: 'absolute',
          left: 0,
          right: 12, // leave room for the arrow head
          top: 38,
          height: 2,
          backgroundColor: theme.colors.text,
          borderRadius: 1,
        },
        arrowHead: {
          position: 'absolute',
          right: 0,
          top: 34,
          width: 0,
          height: 0,
          borderTopWidth: 5,
          borderBottomWidth: 5,
          borderLeftWidth: 10,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: theme.colors.text,
        },
        majorTickLine: {
          position: 'absolute',
          width: 1.5,
          height: 14,
          top: 32, // straddle the line (line is at top:38, height 2)
          backgroundColor: theme.colors.text,
        },
        majorTickLabel: {
          position: 'absolute',
          top: 52,
          fontSize: 10,
          color: theme.colors.textMuted,
          fontWeight: '600',
        },
        // Today marker: a distinct vertical pill that sits across the
        // arrow line, with a small "now" label below.
        todayMark: {
          position: 'absolute',
          width: 3,
          height: 22,
          top: 28,
          backgroundColor: theme.colors.text,
          borderRadius: 1.5,
        },
        todayLabel: {
          position: 'absolute',
          top: 0,
          fontSize: 9,
          fontWeight: '800',
          color: theme.colors.text,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        // Red dot for long-term deadline. Stacked above the line so
        // it doesn't compete visually with the major ticks.
        deadlineDot: {
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: 5,
          top: 12,
          backgroundColor: theme.colors.objectiveLong,
          borderWidth: 1.5,
          borderColor: theme.colors.surfaceAlt,
        },
        hint: {
          marginTop: theme.spacing.sm,
          textAlign: 'center',
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
        },
      }),
    [theme]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Vision long terme</Text>
        <Text style={styles.rangeLabel}>
          {startYear} → {endYear}
        </Text>
      </View>
      <TouchableOpacity onPress={onTap} activeOpacity={0.7}>
        <View style={styles.timeline} onLayout={onLayout}>
          {/* Base line */}
          <View style={styles.line} />
          <View style={styles.arrowHead} />

          {/* Major 5-year ticks + labels */}
          {majorTicks.map((y) => {
            const x = xForYear(y);
            return (
              <View key={`tick-${y}`}>
                <View style={[styles.majorTickLine, { left: x - 0.75 }]} />
                <Text style={[styles.majorTickLabel, { left: x - 14 }]}>
                  {y}
                </Text>
              </View>
            );
          })}

          {/* Today marker — drawn after ticks so it sits on top */}
          {innerWidth > 0 ? (
            <>
              <View
                style={[styles.todayMark, { left: xForYear(currentYear) - 1.5 }]}
              />
              <Text
                style={[styles.todayLabel, { left: xForYear(currentYear) - 12 }]}
              >
                Now
              </Text>
            </>
          ) : null}

          {/* Red dots: one per year that has any long-term deadline */}
          {deadlineYearsInRange.map((y) => (
            <View
              key={`dot-${y}`}
              style={[styles.deadlineDot, { left: xForYear(y) - 5 }]}
            />
          ))}
        </View>
      </TouchableOpacity>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <Feather name="chevrons-right" size={12} color={theme.colors.textSubtle} />
        <Text style={styles.hint}>
          Appuie sur la frise pour choisir une année.
        </Text>
      </View>
    </View>
  );
}
