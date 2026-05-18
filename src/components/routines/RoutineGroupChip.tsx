import { memo, useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import type { RoutineGroup } from '@/db/routines';
import { useTheme } from '@/lib/themeContext';

// Chip whose background/text interpolate as the inner pager scrolls,
// so the active state changes in lockstep with the swipe instead of
// snapping after onMomentumScrollEnd.

type Props = {
  group: RoutineGroup;
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
  done: number;
  total: number;
  onPress: () => void;
};

const RoutineGroupChip = memo(function RoutineGroupChip({
  group,
  index,
  scrollX,
  pageWidth,
  done,
  total,
  onPress,
}: Props) {
  const { theme } = useTheme();
  const chipColor = group.color ?? theme.colors.routine;
  const inactiveBg = theme.colors.surfaceAlt;
  const activeText = theme.colors.textInverse;
  const inactiveText = theme.colors.textMuted;

  const bgStyle = useAnimatedStyle(() => {
    const idx = scrollX.value / pageWidth;
    const dist = Math.min(1, Math.abs(idx - index));
    const t = 1 - dist;
    return {
      backgroundColor: interpolateColor(t, [0, 1], [inactiveBg, chipColor]),
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const idx = scrollX.value / pageWidth;
    const dist = Math.min(1, Math.abs(idx - index));
    const t = 1 - dist;
    return {
      color: interpolateColor(t, [0, 1], [inactiveText, activeText]),
    };
  });

  const allDone = total > 0 && done === total;
  const countLabel =
    total > 0 ? `  ${done}/${total}${allDone ? ' ✓' : ''}` : '';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: 6,
          borderRadius: theme.radius.pill,
          marginRight: theme.spacing.sm,
        },
        text: {
          fontSize: theme.font.sm,
          fontWeight: '600',
        },
      }),
    [theme]
  );

  return (
    <Animated.View style={[styles.chip, bgStyle]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Animated.Text style={[styles.text, textStyle]}>
          {group.name}
          {countLabel ? (
            <Animated.Text style={[styles.text, textStyle, { opacity: 0.75 }]}>
              {countLabel}
            </Animated.Text>
          ) : null}
        </Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default RoutineGroupChip;
