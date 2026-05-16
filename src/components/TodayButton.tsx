import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/themeContext';

type Props = {
  day: number;
  onPress: () => void;
  onLongPress?: () => void;
  hint?: string;
};

const LONG_PRESS_MS = 500;

export default function TodayButton({
  day,
  onPress,
  onLongPress,
  hint,
}: Props) {
  const { theme } = useTheme();
  const fill = useSharedValue(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredLongPress = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const handlePressIn = () => {
    if (!onLongPress) return;
    triggeredLongPress.current = false;
    cancelAnimation(fill);
    fill.value = withTiming(1, { duration: LONG_PRESS_MS });
    longPressTimer.current = setTimeout(() => {
      triggeredLongPress.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const handlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    cancelAnimation(fill);
    fill.value = withTiming(0, { duration: 150 });
  };

  const handlePress = () => {
    if (triggeredLongPress.current) {
      triggeredLongPress.current = false;
      return;
    }
    onPress();
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignItems: 'center',
        },
        btn: {
          width: 40,
          height: 44,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: theme.colors.today,
          overflow: 'hidden',
          backgroundColor: theme.colors.surface,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 2,
          elevation: 1,
        },
        fillLayer: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.today,
        },
        body: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        dayText: {
          color: theme.colors.today,
          fontSize: theme.font.lg,
          fontWeight: '800',
        },
        hint: {
          fontSize: 9,
          color: theme.colors.textSubtle,
          marginTop: 2,
          letterSpacing: 0.3,
        },
      }),
    [theme]
  );

  const fillStyle = useAnimatedStyle(() => ({
    height: `${fill.value * 100}%`,
  }));

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.btn}
      >
        <Animated.View style={[styles.fillLayer, fillStyle]} />
        <View style={styles.body}>
          <Text style={styles.dayText}>{day}</Text>
        </View>
      </Pressable>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}
