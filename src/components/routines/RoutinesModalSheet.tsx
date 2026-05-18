import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { TASK_COLORS } from '@/lib/colors';
import { useTheme } from '@/lib/themeContext';

// Bottom sheet for creating a group, renaming a group, or creating a
// routine inside the active group. One component, three modes — they
// share the input + actions row, and the colour picker only appears in
// group modes.
export type RoutinesModalState =
  | { type: 'create-group'; name: string; color: string | null }
  | { type: 'rename-group'; id: string; name: string; color: string | null }
  | { type: 'create-routine'; name: string }
  | null;

type Props = {
  modal: RoutinesModalState;
  kbHeight: number;
  onChange: (
    updater: (m: RoutinesModalState) => RoutinesModalState
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function RoutinesModalSheet({
  modal,
  kbHeight,
  onChange,
  onClose,
  onSubmit,
}: Props) {
  const { theme } = useTheme();

  const title = useMemo(() => {
    if (!modal) return '';
    if (modal.type === 'create-group') return 'Nouveau groupe';
    if (modal.type === 'rename-group') return 'Renommer le groupe';
    return 'Nouvelle routine';
  }, [modal]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        },
        title: {
          fontSize: theme.font.lg,
          fontWeight: '700',
          color: theme.colors.text,
          marginBottom: theme.spacing.md,
        },
        input: {
          fontSize: theme.font.lg,
          color: theme.colors.text,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.md,
          marginBottom: theme.spacing.lg,
        },
        colorLabel: {
          fontSize: theme.font.xs,
          fontWeight: '700',
          color: theme.colors.textSubtle,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: theme.spacing.sm,
        },
        colorRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.lg,
        },
        colorChip: {
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        },
        colorChipSelected: {
          borderColor: theme.colors.text,
        },
        colorChipEmpty: {
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
        actions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: theme.spacing.md,
        },
        btn: {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.md,
        },
        btnPrimary: {
          backgroundColor: theme.colors.routine,
        },
        btnText: {
          fontSize: theme.font.md,
          color: theme.colors.text,
          fontWeight: '600',
        },
        btnTextPrimary: {
          color: theme.colors.textInverse,
        },
      }),
    [theme]
  );

  const showColorRow =
    modal &&
    (modal.type === 'create-group' || modal.type === 'rename-group');

  return (
    <Modal
      visible={modal !== null}
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
            <Text style={styles.title}>{title}</Text>
            <TextInput
              value={modal?.name ?? ''}
              onChangeText={(v) =>
                onChange((m) => (m ? { ...m, name: v } : m))
              }
              placeholder={
                modal?.type === 'create-routine'
                  ? 'Titre de la routine…'
                  : 'Nom du groupe…'
              }
              placeholderTextColor={theme.colors.textSubtle}
              style={styles.input}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
            {showColorRow ? (
              <>
                <Text style={styles.colorLabel}>Couleur</Text>
                <View style={styles.colorRow}>
                  {TASK_COLORS.map((c) => {
                    const selected =
                      modal &&
                      (modal.type === 'create-group' ||
                        modal.type === 'rename-group') &&
                      modal.color === c.value;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() =>
                          onChange((m) =>
                            m &&
                            (m.type === 'create-group' ||
                              m.type === 'rename-group')
                              ? { ...m, color: c.value }
                              : m
                          )
                        }
                        style={[
                          styles.colorChip,
                          c.value
                            ? { backgroundColor: c.value }
                            : styles.colorChipEmpty,
                          selected && styles.colorChipSelected,
                        ]}
                      >
                        {!c.value && selected ? (
                          <Feather
                            name="check"
                            size={14}
                            color={theme.colors.text}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}
            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose} style={styles.btn}>
                <Text style={styles.btnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSubmit}
                style={[styles.btn, styles.btnPrimary]}
              >
                <Text style={[styles.btnText, styles.btnTextPrimary]}>
                  Valider
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
