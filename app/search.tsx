import { Stack, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchTasks, type Task } from '@/db/tasks';
import { softColorBg } from '@/lib/colors';
import { theme } from '@/lib/theme';

type Tab = 'active' | 'deleted';

export default function SearchScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('active');
  const [results, setResults] = useState<Task[]>([]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const data = await searchTasks(query, {
        deletedOnly: tab === 'deleted',
      });
      if (!cancelled) setResults(data);
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, tab]);

  const handlePress = (task: Task) => {
    router.push(`/task/${task.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Recherche',
          headerBackTitle: 'Retour',
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <View style={styles.searchBar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une tâche…"
            placeholderTextColor={theme.colors.textSubtle}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
          />
        </View>

        <View style={styles.tabs}>
          {(
            [
              { id: 'active', label: 'Actives' },
              { id: 'deleted', label: 'Supprimées' },
            ] as { id: Tab; label: string }[]
          ).map((t) => {
            const active = tab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setTab(t.id)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={results}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <SearchResultRow task={item} onPress={() => handlePress(item)} />
          )}
          ListHeaderComponent={
            query.trim().length === 0 && results.length > 0 ? (
              <Text style={styles.recentLabel}>Récemment modifiées</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucun résultat.</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SearchResultRow({
  task,
  onPress,
}: {
  task: Task;
  onPress: () => void;
}) {
  const dayLabel = format(parseISO(task.day), 'EEEE d MMMM yyyy', {
    locale: fr,
  });
  const rowBg = softColorBg(task.color);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.resultRow, rowBg !== undefined && { backgroundColor: rowBg }]}
      activeOpacity={0.6}
    >
      <Text
        style={[styles.resultTitle, task.done && styles.resultTitleDone]}
        numberOfLines={1}
      >
        {task.title}
      </Text>
      <Text style={styles.resultMeta}>
        {dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}
        {task.done ? ' · ✓ fait' : ''}
        {task.deletedAt ? ' · supprimée' : ''}
      </Text>
      {task.description ? (
        <Text style={styles.resultDesc} numberOfLines={1}>
          {task.description}
        </Text>
      ) : null}
    </TouchableOpacity>
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
  searchBar: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  searchInput: {
    fontSize: theme.font.lg,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.accent,
  },
  tabText: {
    fontSize: theme.font.md,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  resultRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  resultTitle: {
    fontSize: theme.font.lg,
    color: theme.colors.text,
    fontWeight: '500',
  },
  resultTitleDone: {
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  resultMeta: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  resultDesc: {
    fontSize: theme.font.sm,
    color: theme.colors.textSubtle,
    marginTop: 2,
  },
  empty: {
    paddingTop: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.font.md,
    color: theme.colors.textMuted,
  },
  recentLabel: {
    fontSize: theme.font.xs,
    color: theme.colors.textSubtle,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
});
