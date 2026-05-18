import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DeadlinePickerModal from '@/components/objectives/DeadlinePickerModal';
import type { ObjectiveHorizon } from '@/db/objectives';
import { useTheme } from '@/lib/themeContext';

const HORIZON_LABELS: Record<ObjectiveHorizon, string> = {
  long: 'long terme',
  medium: 'moyen terme',
  short: 'court terme',
};

type Props = {
  visible: boolean;
  horizon: ObjectiveHorizon;
  accent: string;
  onClose: () => void;
  // All three fields are non-empty by construction (button disabled
  // otherwise). description is trimmed, deadline is 'YYYY-MM-DD'.
  onCreate: (params: {
    title: string;
    description: string;
    deadline: string;
  }) => void;
};

// Modal create form for an objective. Enforces the project rule:
// every new objective must have title + description + deadline. Add
// button stays disabled until all three are filled. The deadline is
// chosen via the dedicated DeadlinePickerModal mounted on top.
export default function ObjectiveCreateModal({
  visible,
  horizon,
  accent,
  onClose,
  onCreate,
}: Props) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Track keyboard height ourselves — Android Modal lives in its own
  // window where windowSoftInputMode doesn't lift the content, and
  // KeyboardAvoidingView behaves inconsistently inside Modal. We
  // apply the height as marginBottom on the sheet for reliable
  // lift on both platforms. Same pattern as RoutinesModalSheet.
  const [kbHeight, setKbHeight] = useState(0);

  // Reset every time the modal re-opens so a previous draft doesn't
  // leak into the next create.
  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setDeadline(null);
      setPickerOpen(false);
    }
  }, [visible]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) =>
      setKbHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    deadline !== null;

  const submit = () => {
    if (!canSubmit) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      deadline: deadline as string,
    });
  };

  const deadlineLabel = useMemo(() => {
    if (!deadline) return 'Choisir une deadline…';
    const d = parseISO(deadline);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    const fmt = sameYear ? 'EEEE d MMMM' : 'EEEE d MMMM yyyy';
    const t = format(d, fmt, { locale: fr });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }, [deadline]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: theme.radius.lg,
          borderTopRightRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        },
        title: {
          fontSize: theme.font.lg,
          fontWeight: '700',
          color: accent,
          marginBottom: theme.spacing.md,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        label: {
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 4,
          marginTop: theme.spacing.md,
        },
        labelRequired: {
          color: theme.colors.objectiveLong,
        },
        titleInput: {
          fontSize: theme.font.lg,
          color: theme.colors.text,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.md,
        },
        descInput: {
          fontSize: theme.font.md,
          color: theme.colors.text,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.md,
          minHeight: 64,
          textAlignVertical: 'top',
        },
        deadlineBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: deadline ? accent : 'transparent',
        },
        deadlineBtnText: {
          fontSize: theme.font.md,
          color: theme.colors.text,
          fontWeight: '500',
        },
        deadlineBtnEmpty: {
          color: theme.colors.textMuted,
        },
        actions: {
          flexDirection: 'row',
          gap: theme.spacing.sm,
          marginTop: theme.spacing.lg,
        },
        btn: {
          flex: 1,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.md,
          alignItems: 'center',
        },
        btnSecondary: {
          backgroundColor: theme.colors.surfaceAlt,
        },
        btnPrimary: {
          backgroundColor: accent,
        },
        btnPrimaryDisabled: {
          opacity: 0.4,
        },
        btnText: {
          fontSize: theme.font.md,
          fontWeight: '700',
          color: theme.colors.textMuted,
        },
        btnTextPrimary: {
          color: theme.colors.textInverse,
        },
      }),
    [theme, accent, deadline]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.backdrop}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{ marginBottom: kbHeight }}
        >
          <View style={styles.sheet}>
            <Text style={styles.title}>Nouvel objectif {HORIZON_LABELS[horizon]}</Text>

              <Text style={styles.label}>
                Titre <Text style={styles.labelRequired}>*</Text>
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Ex. Apprendre le japonais"
                placeholderTextColor={theme.colors.textSubtle}
                style={styles.titleInput}
                autoFocus
              />

              <Text style={styles.label}>
                Description <Text style={styles.labelRequired}>*</Text>
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Pourquoi cet objectif ? Comment tu sauras qu'il est atteint ?"
                placeholderTextColor={theme.colors.textSubtle}
                style={styles.descInput}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.label}>
                Deadline <Text style={styles.labelRequired}>*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setPickerOpen(true)}
                style={styles.deadlineBtn}
                activeOpacity={0.7}
              >
                <Feather
                  name="calendar"
                  size={16}
                  color={deadline ? accent : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.deadlineBtnText,
                    !deadline && styles.deadlineBtnEmpty,
                  ]}
                >
                  {deadlineLabel}
                </Text>
              </TouchableOpacity>

              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.btn, styles.btnSecondary]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submit}
                  disabled={!canSubmit}
                  style={[
                    styles.btn,
                    styles.btnPrimary,
                    !canSubmit && styles.btnPrimaryDisabled,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.btnText, styles.btnTextPrimary]}>
                    Créer
                  </Text>
                </TouchableOpacity>
              </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
      {pickerOpen ? (
        <DeadlinePickerModal
          visible={pickerOpen}
          initialDeadline={deadline}
          accent={accent}
          onClose={() => setPickerOpen(false)}
          onConfirm={(d) => {
            setDeadline(d);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </Modal>
  );
}
