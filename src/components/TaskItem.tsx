import { format, parseISO } from 'date-fns';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { softColorBg } from '@/lib/colors';
import { theme } from '@/lib/theme';
import type { Task } from '@/db/tasks';

type Props = {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function TaskItem({ task, onToggle, onPress, onDelete }: Props) {
  const confirmDelete = () => {
    Alert.alert('Supprimer la tâche', task.title, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => onDelete(task.id),
      },
    ]);
  };

  const subtitle =
    task.done && task.doneAt
      ? `Fait à ${format(parseISO(task.doneAt), 'HH:mm')}`
      : task.description;

  const tickColor = task.color ?? theme.colors.done;
  const rowBg = softColorBg(task.color);

  return (
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
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={confirmDelete}
        style={styles.deleteBtn}
        hitSlop={8}
      >
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
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
  deleteBtn: {
    marginLeft: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  deleteText: {
    fontSize: theme.font.lg,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
});
