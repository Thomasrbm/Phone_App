import { Feather } from '@expo/vector-icons';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCallback, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TaskItem from '@/components/TaskItem';
import {
  listDeletedTasksByDay,
  restoreTask,
  type Task,
} from '@/db/tasks';
import { theme } from '@/lib/theme';

export default function TrashScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);

  const reload = useCallback(
    async (animate = false) => {
      const data = await listDeletedTasksByDay(date);
      if (animate) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setTasks(data);
    },
    [date]
  );

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleRestore = async (id: string) => {
    await restoreTask(id);
    reload(true);
  };

  const handlePress = (id: string) => {
    router.push(`/task/${id}`);
  };

  const title = format(parseISO(date), 'EEEE d MMMM', { locale: fr });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Corbeille — ${title.charAt(0).toUpperCase() + title.slice(1)}`,
          headerBackTitle: 'Jour',
        }}
      />
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onPress={handlePress}
            onSwipeAction={handleRestore}
            swipe="restore"
            hideCheckbox
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather
              name="trash-2"
              size={40}
              color={theme.colors.textSubtle}
            />
            <Text style={styles.emptyText}>Aucune tâche supprimée.</Text>
            <Text style={styles.emptyHint}>
              Les tâches que tu supprimes apparaîtront ici, swipe vers la
              gauche pour restaurer.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  empty: {
    paddingTop: theme.spacing.xl * 2,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.font.lg,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.lg,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: theme.font.md,
    color: theme.colors.textSubtle,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
