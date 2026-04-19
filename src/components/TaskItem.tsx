import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  RectButton,
  Swipeable,
} from 'react-native-gesture-handler';
import { softColorBg } from '@/lib/colors';
import { theme } from '@/lib/theme';
import type { Task } from '@/db/tasks';

export type SwipeAction = 'delete' | 'restore' | 'none';

type Props = {
  task: Task;
  onToggle?: (id: string, done: boolean) => void;
  onPress: (id: string) => void;
  onSwipeAction?: (id: string) => void;
  swipe?: SwipeAction;
  hideCheckbox?: boolean;
};

export default function TaskItem({
  task,
  onToggle,
  onPress,
  onSwipeAction,
  swipe = 'delete',
  hideCheckbox = false,
}: Props) {
  const swipeableRef = useRef<Swipeable>(null);

  const subtitle =
    task.done && task.doneAt
      ? `Fait à ${format(parseISO(task.doneAt), 'HH:mm')}`
      : task.description;

  const tickColor = task.color ?? theme.colors.done;
  const rowBg = softColorBg(task.color);

  const renderRightActions = () => {
    if (swipe === 'delete') {
      return (
        <RectButton
          style={[styles.action, styles.actionDelete]}
          onPress={() => {
            swipeableRef.current?.close();
            onSwipeAction?.(task.id);
          }}
        >
          <Feather name="trash-2" size={22} color={theme.colors.textInverse} />
        </RectButton>
      );
    }
    if (swipe === 'restore') {
      return (
        <RectButton
          style={[styles.action, styles.actionRestore]}
          onPress={() => {
            swipeableRef.current?.close();
            onSwipeAction?.(task.id);
          }}
        >
          <Feather
            name="rotate-ccw"
            size={22}
            color={theme.colors.textInverse}
          />
        </RectButton>
      );
    }
    return null;
  };

  const row = (
    <View
      style={[
        styles.row,
        rowBg !== undefined && { backgroundColor: rowBg },
        task.done && styles.rowDone,
      ]}
    >
      {hideCheckbox ? null : (
        <TouchableOpacity
          onPress={() => onToggle?.(task.id, !task.done)}
          style={styles.checkbox}
          hitSlop={8}
        >
          <View
            style={[
              styles.box,
              task.done && {
                backgroundColor: tickColor,
                borderColor: tickColor,
              },
            ]}
          >
            {task.done ? (
              <Feather
                name="check"
                size={16}
                color={theme.colors.textInverse}
              />
            ) : null}
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => onPress(task.id)}
        style={styles.titleWrap}
        activeOpacity={0.6}
      >
        <Text
          style={[styles.title, task.done && styles.titleDone]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );

  if (swipe === 'none') return row;

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      {row}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    height: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  rowDone: {
    opacity: 0.55,
  },
  checkbox: {
    marginRight: theme.spacing.md,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.font.lg,
    color: theme.colors.text,
  },
  titleDone: {
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  subtitle: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  action: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionDelete: {
    backgroundColor: '#e03e3e',
  },
  actionRestore: {
    backgroundColor: '#dfab01',
  },
});
