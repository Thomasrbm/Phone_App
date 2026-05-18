import { Feather } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Routine } from '@/db/routines';
import type { FeatherName } from '@/lib/icons';
import { useTheme } from '@/lib/themeContext';

type Props = {
  routine: Routine;
  done: boolean;
  accent: string;
  onToggle: (id: string, nextDone: boolean) => void;
};

// POLISH:routine-burst — row with a check-icon scale pop when the row
// transitions from undone → done. To remove the feature: collapse the
// inner Animated.View back to a plain View.
const RoutineRow = memo(function RoutineRow({
  routine,
  done,
  accent,
  onToggle,
}: Props) {
  const { theme } = useTheme();
  const iconName = (routine.icon as FeatherName | null) ?? null;
  const burst = useSharedValue(1);
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) {
      burst.value = withSequence(
        withTiming(1.35, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 160, easing: Easing.inOut(Easing.quad) })
      );
    }
    wasDone.current = done;
  }, [done, burst]);
  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burst.value }],
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        },
        check: {
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.sm,
          backgroundColor: 'transparent',
        },
        text: {
          flex: 1,
          fontSize: theme.font.md,
          color: theme.colors.text,
          fontWeight: '500',
        },
        textDone: {
          color: theme.colors.textMuted,
          textDecorationLine: 'line-through',
        },
      }),
    [theme]
  );

  return (
    <TouchableOpacity
      onPress={() => onToggle(routine.id, !done)}
      activeOpacity={0.7}
      style={styles.row}
    >
      <Animated.View
        style={[
          styles.check,
          { borderColor: accent },
          done && { backgroundColor: accent },
          burstStyle,
        ]}
      >
        {done ? (
          <Feather name="check" size={14} color={theme.colors.textInverse} />
        ) : iconName ? (
          <Feather name={iconName} size={12} color={accent} />
        ) : null}
      </Animated.View>
      <Text style={[styles.text, done && styles.textDone]}>{routine.title}</Text>
    </TouchableOpacity>
  );
});
// /POLISH:routine-burst

export default RoutineRow;
