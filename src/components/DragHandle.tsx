import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/themeContext';

type Props = {
  // Direction the user must swipe to trigger. 'up' means finger goes up.
  direction: 'down' | 'up';
  onTrigger: () => void;
  label?: string;
  threshold?: number;
};

// Lightweight handle: a small bar that responds to a directional swipe.
// Only the bar itself jiggles during the drag (so it never gets stuck
// translated when navigation happens). Crossing the threshold fires
// onTrigger; the bar springs back regardless.
export default function DragHandle({
  direction,
  onTrigger,
  label,
  threshold = 60,
}: Props) {
  const { theme } = useTheme();
  const ty = useSharedValue(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          paddingVertical: 10,
          alignItems: 'center',
          justifyContent: 'center',
        },
        bar: {
          width: 44,
          height: 5,
          borderRadius: 3,
          backgroundColor: theme.colors.textSubtle,
          opacity: 0.55,
        },
        label: {
          marginTop: 4,
          fontSize: 10,
          color: theme.colors.textSubtle,
          letterSpacing: 0.4,
        },
      }),
    [theme]
  );

  const pan = Gesture.Pan()
    .activeOffsetY(direction === 'down' ? [12, 9999] : [-9999, -12])
    .failOffsetX([-25, 25])
    .onUpdate((e) => {
      // Only let the bar nudge a little so the user sees feedback.
      const dy = e.translationY;
      if (direction === 'down' && dy > 0) {
        ty.value = Math.min(dy * 0.4, 24);
      } else if (direction === 'up' && dy < 0) {
        ty.value = Math.max(dy * 0.4, -24);
      }
    })
    .onEnd((e) => {
      const passed =
        direction === 'down'
          ? e.translationY > threshold
          : e.translationY < -threshold;
      ty.value = withSpring(0, { damping: 22, stiffness: 260 });
      if (passed) runOnJS(onTrigger)();
    });

  const barAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.wrap}>
        <Animated.View style={[styles.bar, barAnim]} />
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </GestureDetector>
  );
}
