import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '@/lib/theme';
import type { Task } from '@/db/tasks';

type Props = {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

export default function TaskItem({ task, onToggle, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const startEdit = () => {
    setDraft(task.title);
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.title) {
      onEdit(task.id, trimmed);
    }
    setEditing(false);
  };

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

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => onToggle(task.id, !task.done)}
        style={styles.checkbox}
        hitSlop={8}
      >
        <View style={[styles.box, task.done && styles.boxDone]}>
          {task.done ? <Text style={styles.check}>✓</Text> : null}
        </View>
      </TouchableOpacity>

      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={commitEdit}
          onSubmitEditing={commitEdit}
          autoFocus
          style={styles.input}
          returnKeyType="done"
        />
      ) : (
        <TouchableOpacity onPress={startEdit} style={styles.titleWrap}>
          <Text style={[styles.title, task.done && styles.titleDone]}>
            {task.title}
          </Text>
        </TouchableOpacity>
      )}

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
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
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
  boxDone: {
    backgroundColor: theme.colors.done,
    borderColor: theme.colors.done,
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
  input: {
    flex: 1,
    fontSize: theme.font.lg,
    color: theme.colors.text,
    paddingVertical: 0,
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
