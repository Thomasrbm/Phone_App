import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DeadlinePickerModal from '@/components/objectives/DeadlinePickerModal';
import {
  getObjectiveById,
  type Objective,
  type ObjectiveHorizon,
} from '@/db/objectives';
import { softDeleteObjective, updateObjective } from '@/data/mutations';
import { useTheme } from '@/lib/themeContext';

const HORIZON_LABELS: Record<ObjectiveHorizon, string> = {
  long: 'Long terme',
  medium: 'Moyen terme',
  short: 'Court terme',
};

const HORIZON_ORDER: ObjectiveHorizon[] = ['long', 'medium', 'short'];

// Edit screen for a single objective. Title (multiline), description,
// horizon picker, delete. Auto-save on blur — same pattern as
// /task/[id]. Tap-to-switch horizon updates immediately.
export default function ObjectiveEditScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const headerHeight = useHeaderHeight();

  const [objective, setObjective] = useState<Objective | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [horizon, setHorizon] = useState<ObjectiveHorizon>('long');
  const [deadline, setDeadline] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getObjectiveById(id).then((o) => {
        if (cancelled || !o) return;
        setObjective(o);
        setTitle(o.title);
        setDescription(o.description ?? '');
        setHorizon(o.horizon);
        setDeadline(o.deadline);
      });
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  // Auto-save horizon on change (the picker is a single tap so there's
  // no ambiguous edit state to debounce).
  useEffect(() => {
    if (!objective) return;
    if (horizon === objective.horizon) return;
    updateObjective(id, { horizon });
  }, [horizon, objective, id]);

  // Deadline: same auto-save pattern. null != null is a no-op since the
  // strict equality holds. Picker emits 'YYYY-MM-DD' or null.
  useEffect(() => {
    if (!objective) return;
    if (deadline === objective.deadline) return;
    updateObjective(id, { deadline });
  }, [deadline, objective, id]);

  const saveTitle = () => {
    if (!objective) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === objective.title) return;
    updateObjective(id, { title: trimmed });
  };

  const saveDescription = () => {
    if (!objective) return;
    const next = description.trim() === '' ? null : description;
    if (next === objective.description) return;
    updateObjective(id, { description: next });
  };

  const handleDelete = async () => {
    if (!objective) return;
    await softDeleteObjective(id);
    router.back();
  };

  const accent =
    horizon === 'long'
      ? theme.colors.objectiveLong
      : horizon === 'medium'
        ? theme.colors.objectiveMedium
        : theme.colors.objectiveShort;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        flex: { flex: 1 },
        content: {
          flex: 1,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        },
        section: {
          marginBottom: theme.spacing.xl,
        },
        label: {
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: theme.spacing.sm,
        },
        titleInput: {
          fontSize: theme.font.xl,
          color: theme.colors.text,
          fontWeight: '600',
          paddingVertical: theme.spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
        descInput: {
          fontSize: theme.font.lg,
          color: theme.colors.text,
          paddingVertical: theme.spacing.sm,
          minHeight: 80,
          textAlignVertical: 'top',
        },
        horizonRow: {
          flexDirection: 'row',
          gap: theme.spacing.sm,
        },
        horizonChip: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surfaceAlt,
        },
        horizonChipText: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          fontWeight: '600',
        },
        horizonChipTextActive: {
          color: theme.colors.textInverse,
        },
        deleteBtn: {
          marginTop: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          alignItems: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        },
        deleteText: {
          color: theme.colors.objectiveLong,
          fontSize: theme.font.md,
          fontWeight: '600',
        },
        headerCloseBtn: {
          paddingHorizontal: theme.spacing.md,
        },
        deadlineBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          alignSelf: 'flex-start',
        },
        deadlineBtnText: {
          fontSize: theme.font.md,
          color: theme.colors.text,
          fontWeight: '500',
        },
        deadlineBtnEmpty: {
          color: theme.colors.textMuted,
        },
      }),
    [theme]
  );

  const deadlineLabel = useMemo(() => {
    if (!deadline) return null;
    const d = parseISO(deadline);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    const fmt = sameYear ? 'EEEE d MMMM' : 'EEEE d MMMM yyyy';
    const t = format(d, fmt, { locale: fr });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }, [deadline]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Objectif',
          headerBackTitle: 'Retour',
          headerTintColor: accent,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerCloseBtn}
              hitSlop={8}
            >
              <Feather name="x" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Titre</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              onBlur={saveTitle}
              style={styles.titleInput}
              placeholder="Titre de l'objectif"
              placeholderTextColor={theme.colors.textSubtle}
              multiline
              disableFullscreenUI
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Horizon</Text>
            <View style={styles.horizonRow}>
              {HORIZON_ORDER.map((h) => {
                const active = h === horizon;
                const chipColor =
                  h === 'long'
                    ? theme.colors.objectiveLong
                    : h === 'medium'
                      ? theme.colors.objectiveMedium
                      : theme.colors.objectiveShort;
                return (
                  <TouchableOpacity
                    key={h}
                    onPress={() => setHorizon(h)}
                    style={[
                      styles.horizonChip,
                      active && { backgroundColor: chipColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.horizonChipText,
                        active && styles.horizonChipTextActive,
                      ]}
                    >
                      {HORIZON_LABELS[h]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Deadline</Text>
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
                {deadlineLabel ?? 'Aucune deadline'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              onBlur={saveDescription}
              style={styles.descInput}
              placeholder="Notes, étapes, pourquoi cet objectif compte…"
              placeholderTextColor={theme.colors.textSubtle}
              multiline
              textAlignVertical="top"
              disableFullscreenUI
            />
          </View>

          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>Supprimer l&apos;objectif</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    </SafeAreaView>
  );
}
