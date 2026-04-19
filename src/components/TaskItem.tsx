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

type Props = {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  swipeable?: boolean;
};

export default function TaskItem({
  task,
  onToggle,
  onPress,
  onDelete,
  swipeable = true,
}: Props) {
  const swipeableRef = useRef<Swipeable>(null);

  const subtitle =
    task.done && task.doneAt
      ? `Fait à ${format(parseISO(task.doneAt), 'HH:mm')}`
      : task.description;

  const tickColor = task.color ?? theme.colors.done;
  const rowBg = softColorBg(task.color);

  const renderRightActions = () => (
    <RectButton
      style={styles.rightAction}
      onPress={() => {
        swipeableRef.current?.close();
        onDelete(task.id);
      }}
    >
      <Text style={styles.rightActionText}>Supprimer</Text>
    </RectButton>
  );

  const row = (
    <View
      style={[
        styles.row,
        rowBg !== undefined && { backgroundColor: rowBg },
        task.done && styles.rowDone,
      ]}
    >
      <TouchableOpacity
        onPress={() => onToggle(task.id, !task.done)}
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
          {task.done ? <Text style={styles.check}>✓</Text> : null}
        </View>
      </TouchableOpacity>

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
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle ?? ' '}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!swipeable) return row;

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
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 64,
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
  check: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
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
    minHeight: 16,
  },
  rightAction: {
    backgroundColor: '#e03e3e',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  rightActionText: {
    color: theme.colors.textInverse,
    fontWeight: '700',
    fontSize: theme.font.md,
  },
});
