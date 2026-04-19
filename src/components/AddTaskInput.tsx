import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
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
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (expanded) {
      // Slight delay so the input is mounted before focus
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [expanded]);

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
    Keyboard.dismiss();
    setExpanded(false);
  };

  const cancel = () => {
    // Keep draft (title, description, color) — only collapse + dismiss kb.
    Keyboard.dismiss();
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <TouchableOpacity
        style={styles.collapsed}
        onPress={() => setExpanded(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.collapsedText}>Ajouter une nouvelle tâche</Text>
        <View style={styles.btn}>
          <Text style={styles.btnText}>+</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.expanded}>
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={cancel} style={styles.cancelBtn} hitSlop={8}>
          <Text style={styles.cancelText}>✕</Text>
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={submit}
          placeholder="Titre de la tâche"
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
  collapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  collapsedText: {
    flex: 1,
    fontSize: theme.font.md,
    color: theme.colors.textMuted,
  },
  expanded: {
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
  cancelBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.xs,
  },
  cancelText: {
    fontSize: theme.font.lg,
    color: theme.colors.textMuted,
    fontWeight: '500',
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
    paddingHorizontal: 36,
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
    paddingHorizontal: theme.spacing.md + 32,
  },
});
