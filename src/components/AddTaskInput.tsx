import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const titleRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => titleRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  const canSubmit = title.trim().length > 0;

  const close = () => {
    titleRef.current?.blur();
    descRef.current?.blur();
    Keyboard.dismiss();
    setOpen(false);
  };

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
    close();
  };

  const cancel = () => {
    // Keep draft (title, desc, color) — only close
    close();
  };

  const pickColor = (c: string | null) => {
    setColor(c);
    titleRef.current?.focus();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.collapsed}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.collapsedText}>Ajouter une nouvelle tâche</Text>
        <View style={styles.btnSmall}>
          <Feather name="plus" size={18} color={theme.colors.textInverse} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={cancel}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={cancel} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.kavWrap}
            pointerEvents="box-none"
          >
            <View style={styles.sheet}>
              <View style={styles.titleRow}>
                <TouchableOpacity
                  onPress={cancel}
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <Feather
                    name="x"
                    size={22}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
                <TextInput
                  ref={titleRef}
                  value={title}
                  onChangeText={setTitle}
                  onSubmitEditing={() => descRef.current?.focus()}
                  placeholder="Titre de la tâche"
                  placeholderTextColor={theme.colors.textSubtle}
                  style={styles.titleInput}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  onPress={submit}
                  style={[styles.btnPrimary, !canSubmit && styles.btnDisabled]}
                  disabled={!canSubmit}
                >
                  <Feather
                    name="plus"
                    size={20}
                    color={theme.colors.textInverse}
                  />
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

              <Pressable
                onPress={() => descRef.current?.focus()}
                style={styles.descWrap}
              >
                <TextInput
                  ref={descRef}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Description (optionnel)"
                  placeholderTextColor={theme.colors.textSubtle}
                  style={styles.descInput}
                  multiline
                  textAlignVertical="top"
                />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
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
  btnSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  kavWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: {
    flex: 1,
    fontSize: theme.font.lg,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    marginHorizontal: theme.spacing.xs,
  },
  btnPrimary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  colorRow: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotNone: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: theme.colors.text,
  },
  descWrap: {
    marginTop: theme.spacing.sm,
    minHeight: 100,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  descInput: {
    fontSize: theme.font.md,
    color: theme.colors.text,
    minHeight: 76,
  },
});
