import { Feather } from '@expo/vector-icons';
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
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [expanded]);

  const canSubmit = title.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    inputRef.current?.blur();
    Keyboard.dismiss();
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      color,
    });
    setTitle('');
    setDescription('');
    setColor(null);
    setExpanded(false);
  };

  const cancel = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
    setExpanded(false);
  };

  const pickColor = (c: string | null) => {
    setColor(c);
    // Re-focus input so the keyboard doesn't close on color tap
    inputRef.current?.focus();
  };

  if (!expanded) {
    return (
      <TouchableOpacity
        style={styles.collapsed}
        onPress={() => setExpanded(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.collapsedText}>Ajouter une nouvelle tâche</Text>
        <View style={styles.btnSmall}>
          <Feather name="plus" size={18} color={theme.colors.textInverse} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.expanded}>
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={cancel} style={styles.iconBtn} hitSlop={8}>
          <Feather name="x" size={20} color={theme.colors.textMuted} />
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
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={submit}
          style={[styles.btnSmall, !canSubmit && styles.btnDisabled]}
          disabled={!canSubmit}
        >
          <Feather name="plus" size={18} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colorRow}
        keyboardShouldPersistTaps="always"
      >
        {TASK_COLORS.map((c) => {
          const selected = c.value === color;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => pickColor(c.value)}
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
    paddingVertical: 10,
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
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: {
    flex: 1,
    fontSize: theme.font.md,
    color: theme.colors.text,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    marginHorizontal: 4,
  },
  btnSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  colorRow: {
    paddingTop: 6,
    paddingBottom: 4,
    paddingHorizontal: 36,
    gap: 8,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
    fontSize: theme.font.sm,
    color: theme.colors.text,
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.sm + 32,
  },
});
