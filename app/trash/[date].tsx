import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import DragHandle from '@/components/DragHandle';
import TaskItem from '@/components/TaskItem';
import { restoreTask } from '@/data/mutations';
import { deletedTasksByDayView, EMPTY_TASKS } from '@/data/views';
import { useTheme } from '@/lib/themeContext';

export default function TrashScreen() {
  const { theme } = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const tasks = deletedTasksByDayView.useView(date, EMPTY_TASKS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectMode = selectedIds.size > 0;

  const handleRestore = (id: string) => {
    restoreTask(id, date);
  };

  const handlePress = (id: string) => {
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

  const selectAll = () => {
    setSelectedIds(new Set(tasks.map((t) => t.id)));
  };

  const restoreSelected = async () => {
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    for (const id of ids) {
      await restoreTask(id, date);
    }
  };

  const title = format(parseISO(date), 'EEEE d MMMM', { locale: fr });
  const allSelected =
    selectMode && tasks.length > 0 && tasks.every((t) => selectedIds.has(t.id));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        headerLeftBtn: {
          paddingHorizontal: theme.spacing.md,
        },
        headerRightBtn: {
          paddingHorizontal: theme.spacing.md,
        },
        cancelLink: {
          color: theme.colors.accent,
          fontSize: theme.font.md,
          fontWeight: '500',
        },
        selectAllLink: {
          color: '#6940a5',
          fontSize: theme.font.sm,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.3,
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
        restoreBar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f59e0b',
          paddingVertical: theme.spacing.md,
          gap: theme.spacing.sm,
        },
        restoreBarText: {
          color: theme.colors.textInverse,
          fontSize: theme.font.lg,
          fontWeight: '700',
        },
      }),
    [theme]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: selectMode
            ? `${selectedIds.size} sélectionnée${selectedIds.size > 1 ? 's' : ''}`
            : `Corbeille — ${title.charAt(0).toUpperCase() + title.slice(1)}`,
          headerBackTitle: 'Jour',
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
          headerRight: selectMode
            ? () => (
                <TouchableOpacity
                  onPress={allSelected ? exitSelectMode : selectAll}
                  hitSlop={8}
                  style={styles.headerRightBtn}
                >
                  <Text style={styles.selectAllLink}>
                    {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </Text>
                </TouchableOpacity>
              )
            : undefined,
        }}
      />
      <Animated.FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        itemLayoutAnimation={LinearTransition.duration(300)}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onPress={handlePress}
            onLongPress={handleLongPress}
            onSwipeAction={handleRestore}
            swipe="restore"
            hideCheckbox
            selectMode={selectMode}
            selected={selectedIds.has(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {/* POLISH:empty-trash */}
            <Feather
              name="trash-2"
              size={44}
              color={theme.colors.textSubtle}
              style={{ opacity: 0.45 }}
            />
            <Text style={styles.emptyText}>Corbeille vide</Text>
            <Text style={styles.emptyHint}>
              Les tâches supprimées atterrissent ici{'\n'}— swipe vers la
              gauche pour restaurer
            </Text>
            {/* /POLISH:empty-trash */}
          </View>
        }
      />
      {selectMode ? (
        <TouchableOpacity
          onPress={restoreSelected}
          style={styles.restoreBar}
          activeOpacity={0.8}
        >
          <Feather
            name="rotate-ccw"
            size={18}
            color={theme.colors.textInverse}
          />
          <Text style={styles.restoreBarText}>
            Restaurer ({selectedIds.size})
          </Text>
        </TouchableOpacity>
      ) : null}
      {!selectMode ? (
        <DragHandle
          direction="up"
          onTrigger={() => router.back()}
          label="Retour"
        />
      ) : null}
    </SafeAreaView>
  );
}
