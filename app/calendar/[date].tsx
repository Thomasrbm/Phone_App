import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddTaskInput from '@/components/AddTaskInput';
import TaskItem from '@/components/TaskItem';
import {
  createTask,
  deleteTask,
  listTasksByDay,
  toggleTaskDone,
  type Task,
} from '@/db/tasks';
import { theme } from '@/lib/theme';

type Section = { title: string; data: Task[] };

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const headerHeight = useHeaderHeight();

  const reload = useCallback(async () => {
    const data = await listTasksByDay(date);
    setTasks(data);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const sections = useMemo<Section[]>(() => {
    const todo = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);
    const out: Section[] = [];
    out.push({ title: 'À faire', data: todo });
    if (done.length > 0) out.push({ title: 'Faits', data: done });
    return out;
  }, [tasks]);

  const handleAdd = async (params: {
    title: string;
    description: string | null;
    color: string | null;
  }) => {
    await createTask({ day: date, ...params });
    reload();
  };

  const handleToggle = async (id: string, done: boolean) => {
    await toggleTaskDone(id, done);
    reload();
  };

  const handlePress = (id: string) => {
    router.push(`/task/${id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    reload();
  };

  const title = format(parseISO(date), 'EEEE d MMMM', { locale: fr });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: title.charAt(0).toUpperCase() + title.slice(1),
          headerBackTitle: 'Mois',
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggle={handleToggle}
              onPress={handlePress}
              onDelete={handleDelete}
            />
          )}
          renderSectionHeader={({ section }) =>
            section.data.length > 0 ? (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucune tâche pour ce jour.</Text>
              <Text style={styles.emptyHint}>
                Ajoute-en une avec l'input en bas.
              </Text>
            </View>
          }
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
        />
        <AddTaskInput onSubmit={handleAdd} />
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
  sectionHeader: {
    fontSize: theme.font.xs,
    color: theme.colors.textSubtle,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  empty: {
    paddingTop: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.font.lg,
    color: theme.colors.textMuted,
  },
  emptyHint: {
    fontSize: theme.font.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
});
