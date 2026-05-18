import { Feather } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Objective } from '@/db/objectives';
import { useTheme } from '@/lib/themeContext';

type Props = {
  objective: Objective;
  accent: string;
  onToggle: (id: string, nextDone: boolean) => void;
  onPress: (id: string) => void;
};

// Single objective row. Same shape as TaskItem / RoutineRow but
// purpose-built: tap the check to toggle done, tap the body to open
// the edit screen. No swipe-delete here — delete lives behind the
// edit screen for objectives (they're heavier than tasks, harder to
// recreate accidentally).
//
// POLISH:objective-burst — check icon scales up briefly when the row
// transitions undone → done. Identical animation to RoutineRow.
const ObjectiveRow = memo(function ObjectiveRow({
  objective,
  accent,
  onToggle,
  onPress,
}: Props) {
  const { theme } = useTheme();
  const burst = useSharedValue(1);
  const wasDone = useRef(objective.done);
  useEffect(() => {
    if (objective.done && !wasDone.current) {
      burst.value = withSequence(
        withTiming(1.35, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 160, easing: Easing.inOut(Easing.quad) })
      );
    }
    wasDone.current = objective.done;
  }, [objective.done, burst]);
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
          paddingVertical: theme.spacing.md,
        },
        check: {
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
          backgroundColor: 'transparent',
        },
        body: {
          flex: 1,
        },
        title: {
          fontSize: theme.font.md,
          color: theme.colors.text,
          fontWeight: '500',
        },
        titleDone: {
          color: theme.colors.textMuted,
          textDecorationLine: 'line-through',
        },
        description: {
          fontSize: theme.font.sm,
          color: theme.colors.textSubtle,
          marginTop: 2,
        },
      }),
    [theme]
  );

  return (
    <TouchableOpacity
      onPress={() => onPress(objective.id)}
      activeOpacity={0.7}
      style={styles.row}
    >
      <TouchableOpacity
        onPress={() => onToggle(objective.id, !objective.done)}
        hitSlop={8}
      >
        <Animated.View
          style={[
            styles.check,
            { borderColor: accent },
            objective.done && { backgroundColor: accent },
            burstStyle,
          ]}
        >
          {objective.done ? (
            <Feather name="check" size={14} color={theme.colors.textInverse} />
          ) : null}
        </Animated.View>
      </TouchableOpacity>
      <View style={styles.body}>
        <Text
          style={[styles.title, objective.done && styles.titleDone]}
          numberOfLines={2}
        >
          {objective.title}
        </Text>
        {objective.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {objective.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});
// /POLISH:objective-burst

export default ObjectiveRow;
