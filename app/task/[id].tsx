import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TASK_COLORS } from '@/lib/colors';
import { theme } from '@/lib/theme';
import {
  deleteTask,
  getTaskById,
  updateTask,
  type Task,
} from '@/db/tasks';

export default function TaskEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const headerHeight = useHeaderHeight();

  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getTaskById(id).then((t) => {
        if (cancelled || !t) return;
        setTask(t);
        setTitle(t.title);
        setDescription(t.description ?? '');
        setColor(t.color);
      });
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  // Auto-save color the moment it changes
  useEffect(() => {
    if (!task) return;
    if (color === task.color) return;
    updateTask(id, { color });
  }, [color, task, id]);

  const saveTitle = () => {
    if (!task) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) return;
    updateTask(id, { title: trimmed });
  };

  const saveDescription = () => {
    if (!task) return;
    const next = description.trim() === '' ? null : description;
    if (next === task.description) return;
    updateTask(id, { description: next });
  };

  const handleDelete = () => {
    if (!task) return;
    Alert.alert('Supprimer la tâche', task.title, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(id);
          router.back();
        },
      },
    ]);
  };

  const headerTitle = task
    ? format(parseISO(task.day), 'd MMMM', { locale: fr })
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: headerTitle,
          headerBackTitle: 'Retour',
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.label}>Titre</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              onBlur={saveTitle}
              style={styles.titleInput}
              placeholder="Titre de la tâche"
              placeholderTextColor={theme.colors.textSubtle}
              returnKeyType="done"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              onBlur={saveDescription}
              style={styles.descInput}
              placeholder="Notes, contexte, détails…"
              placeholderTextColor={theme.colors.textSubtle}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Couleur</Text>
            <View style={styles.colorRow}>
              {TASK_COLORS.map((c) => {
                const selected = c.value === color;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setColor(c.value)}
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor:
                          c.value ?? theme.colors.surfaceAlt,
                      },
                      selected && styles.colorDotSelected,
                      !c.value && styles.colorDotNone,
                    ]}
                  >
                    {selected ? (
                      <Text
                        style={[
                          styles.colorCheck,
                          !c.value && styles.colorCheckNone,
                        ]}
                      >
                        ✓
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {task?.done && task.doneAt ? (
            <View style={styles.section}>
              <Text style={styles.label}>Validée</Text>
              <Text style={styles.doneInfo}>
                {format(parseISO(task.doneAt), "EEEE d MMMM 'à' HH:mm", {
                  locale: fr,
                })}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>Supprimer la tâche</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
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
    minHeight: 100,
    paddingVertical: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  colorCheck: {
    color: theme.colors.textInverse,
    fontSize: theme.font.md,
    fontWeight: '800',
  },
  colorCheckNone: {
    color: theme.colors.text,
  },
  doneInfo: {
    fontSize: theme.font.md,
    color: theme.colors.done,
    fontWeight: '500',
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
    color: theme.colors.today,
    fontSize: theme.font.md,
    fontWeight: '600',
  },
});
