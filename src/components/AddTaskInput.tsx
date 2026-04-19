import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { TASK_COLORS } from '@/lib/colors';
import { theme } from '@/lib/theme';

type SubmitParams = {
  title: string;
  description: string | null;
  color: string | null;
};

type Props = {
  onSubmit: (params: SubmitParams) => void;
};

export default function AddTaskInput({ onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      color,
    });
    setTitle('');
    setDescription('');
    setColor(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={submit}
          placeholder="Nouvelle tâche…"
          placeholderTextColor={theme.colors.textSubtle}
          style={styles.titleInput}
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={submit}
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          disabled={!canSubmit}
        >
          <Text style={styles.btnText}>+</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colorRow}
      >
        {TASK_COLORS.map((c) => {
          const selected = c.value === color;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => setColor(c.value)}
              style={[
                styles.colorDot,
                { backgroundColor: c.value ?? theme.colors.surfaceAlt },
                selected && styles.colorDotSelected,
                !c.value && styles.colorDotNone,
              ]}
            />
          );
        })}
      </ScrollView>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description (optionnel)"
        placeholderTextColor={theme.colors.textSubtle}
        style={styles.descInput}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleInput: {
    flex: 1,
    fontSize: theme.font.lg,
    color: theme.colors.text,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.sm,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnText: {
    color: theme.colors.textInverse,
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 22,
  },
  colorRow: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorDotNone: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
  descInput: {
    fontSize: theme.font.md,
    color: theme.colors.text,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.md,
  },
});
