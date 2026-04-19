import { Feather } from '@expo/vector-icons';
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
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddTaskInput from '@/components/AddTaskInput';
import TaskItem from '@/components/TaskItem';
import {
  createTask,
  listDeletedTasksByDay,
  listTasksByDay,
  softDeleteTask,
  toggleTaskDone,
  type Task,
} from '@/db/tasks';
import { theme } from '@/lib/theme';

type ListItem =
  | {
      type: 'header';
      key: string;
      title: string;
      sectionTaskIds: string[];
      isFirst: boolean;
    }
  | { type: 'task'; key: string; task: Task };

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deletedCount, setDeletedCount] = useState<number>(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const headerHeight = useHeaderHeight();

  const selectMode = selectedIds.size > 0;

  const reload = useCallback(async () => {
    const [active, removed] = await Promise.all([
      listTasksByDay(date),
      listDeletedTasksByDay(date),
    ]);
    setTasks(active);
    setDeletedCount(removed.length);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
    );
  }, [tasks, searchQuery]);

  const items = useMemo<ListItem[]>(() => {
    const todo = filtered.filter((t) => !t.done);
    const done = filtered.filter((t) => t.done);
    const out: ListItem[] = [];
    let isFirst = true;
    if (todo.length > 0) {
      out.push({
        type: 'header',
        key: 'h-todo',
        title: 'À faire',
        sectionTaskIds: todo.map((t) => t.id),
        isFirst,
      });
      isFirst = false;
      for (const t of todo) out.push({ type: 'task', key: t.id, task: t });
    }
    if (done.length > 0) {
      out.push({
        type: 'header',
        key: 'h-done',
        title: 'Faits',
        sectionTaskIds: done.map((t) => t.id),
        isFirst,
      });
      for (const t of done) out.push({ type: 'task', key: t.id, task: t });
    }
    return out;
  }, [filtered]);

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

  const handleTaskPress = (id: string) => {
    if (selectMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    router.push(`/task/${id}`);
  };

  const handleLongPress = (id: string) => {
    if (selectMode) return;
    setSelectedIds(new Set([id]));
  };

  const exitSelectMode = () => setSelectedIds(new Set());

  const handleSwipeDelete = async (id: string) => {
    await softDeleteTask(id);
    reload();
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await softDeleteTask(id);
    }
    setSelectedIds(new Set());
    reload();
  };

  const selectAllInSection = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allAlreadyIn = ids.every((id) => next.has(id));
      if (allAlreadyIn) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  };

  const title = format(parseISO(date), 'd MMMM yyyy', { locale: fr });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: selectMode
            ? `${selectedIds.size} sélectionnée${selectedIds.size > 1 ? 's' : ''}`
            : title.charAt(0).toUpperCase() + title.slice(1),
          headerBackTitle: 'Mois',
          headerLeft: selectMode
            ? () => (
                <TouchableOpacity
                  onPress={exitSelectMode}
                  hitSlop={8}
                  style={styles.headerLeftBtn}
                >
                  <Text style={styles.cancelLink}>Annuler</Text>
                </TouchableOpacity>
              )
            : undefined,
          headerRight: () =>
            selectMode ? null : (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => setSearchOpen((s) => !s)}
                  style={styles.headerBtn}
                  hitSlop={8}
                >
                  <Feather
                    name="search"
                    size={20}
                    color={searchOpen ? theme.colors.accent : theme.colors.text}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push(`/trash/${date}`)}
                  style={styles.headerBtn}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={20} color={theme.colors.text} />
                  {deletedCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{deletedCount}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        {searchOpen && !selectMode ? (
          <View style={styles.searchBar}>
            <Feather
              name="search"
              size={16}
              color={theme.colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher dans ce jour…"
              placeholderTextColor={theme.colors.textSubtle}
              style={styles.searchInput}
              autoFocus
              returnKeyType="search"
            />
          </View>
        ) : null}
        <Animated.FlatList
          style={styles.flex}
          data={items}
          keyExtractor={(item) => item.key}
          itemLayoutAnimation={LinearTransition.duration(300)}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              const allSelected =
                selectMode &&
                item.sectionTaskIds.length > 0 &&
                item.sectionTaskIds.every((id) => selectedIds.has(id));
              return (
                <View
                  style={[
                    styles.sectionHeaderRow,
                    !item.isFirst && styles.sectionDivider,
                  ]}
                >
                  <Text style={styles.sectionHeader}>{item.title}</Text>
                  {selectMode ? (
                    <TouchableOpacity
                      onPress={() =>
                        selectAllInSection(item.sectionTaskIds)
                      }
                      hitSlop={8}
                    >
                      <Text style={styles.selectAllBtn}>
                        {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            }
            return (
              <TaskItem
                task={item.task}
                onToggle={handleToggle}
                onPress={handleTaskPress}
                onLongPress={handleLongPress}
                onSwipeAction={handleSwipeDelete}
                swipe="delete"
                selectMode={selectMode}
                selected={selectedIds.has(item.task.id)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Aucun résultat.'
                  : 'Aucune tâche pour ce jour.'}
              </Text>
              {!searchQuery ? (
                <Text style={styles.emptyHint}>
                  Ajoute-en une avec l'input en bas.
                </Text>
              ) : null}
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
        {/* Animated.FlatList needs the closing tag. */}
        {selectMode ? (
          <TouchableOpacity
            onPress={deleteSelected}
            style={styles.deleteBar}
            activeOpacity={0.8}
          >
            <Feather name="trash-2" size={18} color={theme.colors.textInverse} />
            <Text style={styles.deleteBarText}>
              Supprimer ({selectedIds.size})
            </Text>
          </TouchableOpacity>
        ) : (
          <AddTaskInput onSubmit={handleAdd} />
        )}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingRight: theme.spacing.md,
  },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerLeftBtn: {
    paddingHorizontal: theme.spacing.md,
  },
  cancelLink: {
    color: theme.colors.accent,
    fontSize: theme.font.md,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    backgroundColor: theme.colors.today,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: theme.colors.textInverse,
    fontSize: 9,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.font.md,
    color: theme.colors.text,
    paddingVertical: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  sectionDivider: {
    marginTop: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  sectionHeader: {
    fontSize: theme.font.xs,
    color: theme.colors.textSubtle,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectAllBtn: {
    fontSize: theme.font.sm,
    color: '#6940a5',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
  deleteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e03e3e',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  deleteBarText: {
    color: theme.colors.textInverse,
    fontSize: theme.font.lg,
    fontWeight: '700',
  },
});
