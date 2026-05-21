import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/themeContext';

type Props = {
  done: number;
  total: number;
};

// "Progrès du jour" card shown only for the current day. Animated fill
// bar + colour-shift toward the "done" palette when every task is
// checked.
//
// POLISH:all-done-pop — when allDone, fade the card background + footer
// text toward theme.colors.done. Pure colour shift (no scale that could
// leak outside the card).
export default function DayProgressCard({ done, total }: Props) {
  const { theme } = useTheme();
  const ratio = total === 0 ? 0 : done / total;
  const allDone = total > 0 && done === total;
  const remaining = total - done;
  const footer =
    total === 0
      ? "Aucune tâche pour aujourd'hui."
      : allDone
        ? 'Journée bouclée ✓'
        : `${remaining} restante${remaining > 1 ? 's' : ''}`;

  // Animate the bar so checking a task glides smoothly. Initial value
  // matches the current ratio (vs starting from 0) so a fresh mount
  // mid-session doesn't replay the fill from empty.
  const progressRatio = useSharedValue(ratio);
  useEffect(() => {
    progressRatio.value = withTiming(ratio, {
      duration: 80,
      easing: Easing.out(Easing.quad),
    });
  }, [ratio, progressRatio]);

  // Animate scaleX (GPU, no relayout) rather than width %, which forces
  // Android to relayout the bar every frame and stutters the check
  // interaction. transformOrigin anchors the scale at the left edge so
  // the fill grows from 0 → done ratio toward the right.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressRatio.value }],
  }));

  const doneTint = useSharedValue(allDone ? 1 : 0);
  useEffect(() => {
    doneTint.value = withTiming(allDone ? 1 : 0, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    });
  }, [allDone, doneTint]);
  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      doneTint.value,
      [0, 1],
      [theme.colors.surfaceAlt, theme.colors.doneSoft]
    ),
  }));
  const footerStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      doneTint.value,
      [0, 1],
      [theme.colors.textMuted, theme.colors.done]
    ),
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginTop: theme.spacing.lg,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceAlt,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: theme.spacing.sm,
        },
        label: {
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        count: {
          fontSize: theme.font.lg,
          color: theme.colors.text,
          fontWeight: '700',
        },
        bar: {
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.colors.border,
          overflow: 'hidden',
        },
        fill: {
          height: '100%',
          width: '100%',
          backgroundColor: theme.colors.done,
          borderRadius: 4,
          transformOrigin: 'left',
        },
        footer: {
          marginTop: theme.spacing.sm,
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
        },
      }),
    [theme]
  );

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <View style={styles.header}>
        <Text style={styles.label}>Progrès du jour</Text>
        <Text style={styles.count}>
          {done}/{total}
        </Text>
      </View>
      <View style={styles.bar}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <Animated.Text style={[styles.footer, footerStyle]}>{footer}</Animated.Text>
    </Animated.View>
  );
}
