import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Card from '@/components/shared/Card';
import { useTheme } from '@/lib/themeContext';

type Props = {
  done: number;
  total: number;
};

// "Progrès du jour" card shown only for the current day. Animated fill
// bar + a doneSoft tint that fades in when every task is checked.
//
// Uses the shared Card (raised → white surface + elevation.sm). The
// all-done tint can't live on the Card's own background (that's static),
// so it's an absolutely-positioned rounded overlay behind the content.
export default function DayProgressCard({ done, total }: Props) {
  const { theme } = useTheme();
  const ratio = total === 0 ? 0 : done / total;
  const percent = Math.round(ratio * 100);
  const allDone = total > 0 && done === total;
  const remaining = total - done;
  const footer =
    total === 0
      ? "Aucune tâche pour aujourd'hui."
      : allDone
        ? 'Journée bouclée'
        : `${remaining} tâche${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`;

  // Animate the bar so checking a task glides smoothly. Initial value
  // matches the current ratio (vs starting from 0) so a fresh mount
  // mid-session doesn't replay the fill from empty.
  const progressRatio = useSharedValue(ratio);
  useEffect(() => {
    progressRatio.value = withTiming(ratio, {
      duration: theme.motion.duration.fast,
      easing: Easing.out(Easing.quad),
    });
  }, [ratio, progressRatio, theme.motion.duration.fast]);

  // Animate scaleX (GPU, no relayout) rather than width %, which forces
  // Android to relayout the bar every frame and stutters the check
  // interaction. transformOrigin anchors the scale at the left edge.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressRatio.value }],
  }));

  const doneTint = useSharedValue(allDone ? 1 : 0);
  useEffect(() => {
    doneTint.value = withTiming(allDone ? 1 : 0, {
      duration: theme.motion.duration.base,
      easing: Easing.out(Easing.quad),
    });
  }, [allDone, doneTint, theme.motion.duration.base]);
  const tintStyle = useAnimatedStyle(() => ({ opacity: doneTint.value }));
  const footerStyle = useAnimatedStyle(() => ({ opacity: 0.7 + doneTint.value * 0.3 }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginTop: theme.spacing.lg,
          paddingVertical: theme.spacing.lg,
          overflow: 'hidden',
        },
        tint: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: theme.colors.doneSoft,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        },
        eyebrow: {
          ...theme.typo.micro,
          color: theme.colors.textSubtle,
          textTransform: 'uppercase',
        },
        countWrap: {
          flexDirection: 'row',
          alignItems: 'baseline',
        },
        count: {
          ...theme.typo.title,
          color: allDone ? theme.colors.done : theme.colors.text,
        },
        percent: {
          ...theme.typo.caption,
          fontWeight: '600',
          color: allDone ? theme.colors.done : theme.colors.textMuted,
          marginLeft: theme.spacing.sm,
        },
        bar: {
          height: 10,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.borderSubtle,
          overflow: 'hidden',
        },
        fill: {
          height: '100%',
          width: '100%',
          backgroundColor: theme.colors.done,
          borderRadius: theme.radius.pill,
          transformOrigin: 'left',
        },
        footerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          marginTop: theme.spacing.md,
        },
        footer: {
          ...theme.typo.caption,
          color: allDone ? theme.colors.done : theme.colors.textMuted,
        },
      }),
    [theme, allDone]
  );

  return (
    <Card variant="raised" style={styles.card}>
      <Animated.View style={[styles.tint, tintStyle]} pointerEvents="none" />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Progrès du jour</Text>
        <View style={styles.countWrap}>
          <Text style={styles.count}>
            {done}/{total}
          </Text>
          {total > 0 ? <Text style={styles.percent}>{percent}%</Text> : null}
        </View>
      </View>
      <View style={styles.bar}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <Animated.View style={[styles.footerRow, footerStyle]}>
        {allDone ? (
          <Feather name="check-circle" size={14} color={theme.colors.done} />
        ) : null}
        <Text style={styles.footer}>{footer}</Text>
      </Animated.View>
    </Card>
  );
}
