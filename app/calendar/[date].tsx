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
  Alert,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddTaskInput from '@/components/AddTaskInput';
import TaskItem from '@/components/TaskItem';
import {
  createTask,
  listDeletedTasksByDay,
  listTasksByDay,
  permanentlyDeleteTask,
  restoreTask,
  softDeleteTask,
  toggleTaskDone,
  type Task,
} from '@/db/tasks';
import { theme } from '@/lib/theme';

type ListItem =
  | { type: 'header'; key: string; title: string }
  | { type: 'task'; key: string; task: Task; section: 'todo' | 'done' | 'deleted' };

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deleted, setDeleted] = useState<Task[]>([]);
  const headerHeight = useHeaderHeight();

  const reload = useCallback(
    async (animate = false) => {
      const [active, removed] = await Promise.all([
        listTasksByDay(date),
        listDeletedTasksByDay(date),
      ]);
      if (animate) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setTasks(active);
      setDeleted(removed);
    },
    [date]
  );

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const items = useMemo<ListItem[]>(() => {
    const todo = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);
    const out: ListItem[] = [];
    if (todo.length > 0) {
      out.push({ type: 'header', key: 'h-todo', title: 'À faire' });
      for (const t of todo)
        out.push({ type: 'task', key: t.id, task: t, section: 'todo' });
    }
    if (done.length > 0) {
      out.push({ type: 'header', key: 'h-done', title: 'Faits' });
      for (const t of done)
        out.push({ type: 'task', key: t.id, task: t, section: 'done' });
    }
    if (deleted.length > 0) {
      out.push({ type: 'header', key: 'h-del', title: 'Supprimées' });
      for (const t of deleted)
        out.push({ type: 'task', key: t.id, task: t, section: 'deleted' });
    }
    return out;
  }, [tasks, deleted]);

  const handleAdd = async (params: {
    title: string;
    description: string | null;
    color: string | null;
  }) => {
    await createTask({ day: date, ...params });
    reload(true);
  };

  const handleToggle = async (id: string, done: boolean) => {
    await toggleTaskDone(id, done);
    reload(true);
  };

  const handleEditPress = (id: string) => {
    router.push(`/task/${id}`);
  };

  const handleSwipeDelete = async (id: string) => {
    await softDeleteTask(id);
    reload(true);
  };

  const handleDeletedPress = (id: string) => {
    const task = deleted.find((t) => t.id === id);
    if (!task) return;
    Alert.alert(task.title, 'Que veux-tu faire de cette tâche supprimée ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Restaurer',
        onPress: async () => {
          await restoreTask(id);
          reload(true);
        },
      },
      {
        text: 'Supprimer définitivement',
        style: 'destructive',
        onPress: async () => {
          await permanentlyDeleteTask(id);
          reload(true);
        },
      },
    ]);
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
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.sectionHeader}>{item.title}</Text>;
            }
            const isDeleted = item.section === 'deleted';
            return (
              <TaskItem
                task={item.task}
                onToggle={isDeleted ? () => {} : handleToggle}
                onPress={isDeleted ? handleDeletedPress : handleEditPress}
                onDelete={handleSwipeDelete}
                swipeable={!isDeleted}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucune tâche pour ce jour.</Text>
              <Text style={styles.emptyHint}>
                Ajoute-en une avec l'input en bas.
              </Text>
            </View>
          }
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
