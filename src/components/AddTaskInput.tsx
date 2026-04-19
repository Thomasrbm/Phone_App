import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '@/lib/theme';

type Props = {
  onSubmit: (title: string) => void;
};

export default function AddTaskInput({ onSubmit }: Props) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <View style={styles.row}>
      <TextInput
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        placeholder="Nouvelle tâche…"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
        returnKeyType="done"
      />
      <TouchableOpacity
        onPress={submit}
        style={[styles.btn, !value.trim() && styles.btnDisabled]}
        disabled={!value.trim()}
      >
        <Text style={styles.btnText}>Ajouter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    fontSize: theme.font.lg,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.sm,
  },
  btn: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: theme.colors.textInverse,
    fontWeight: '600',
    fontSize: theme.font.md,
  },
});
