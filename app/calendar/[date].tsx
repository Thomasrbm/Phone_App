import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCallback, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
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
  updateTask,
  type Task,
} from '@/db/tasks';
import { theme } from '@/lib/theme';

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);

  const reload = useCallback(async () => {
    const data = await listTasksByDay(date);
    setTasks(data);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleAdd = async (title: string) => {
    await createTask({ day: date, title });
    reload();
  };

  const handleToggle = async (id: string, done: boolean) => {
    await toggleTaskDone(id, done);
    reload();
  };

  const handleEdit = async (id: string, title: string) => {
    await updateTask(id, { title });
    reload();
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
      >
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucune tâche pour ce jour.</Text>
              <Text style={styles.emptyHint}>
                Ajoute-en une avec l'input en bas.
              </Text>
            </View>
          }
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
