import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import IconPicker from '@/components/shared/IconPicker';
import {
  getRoutineById,
  listGroups,
  type Routine,
  type RoutineGroup,
} from '@/db/routines';
import { archiveRoutine, updateRoutine } from '@/data/mutations';
import type { FeatherName } from '@/lib/icons';
import { useTheme } from '@/lib/themeContext';

export default function RoutineEditScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<FeatherName | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<RoutineGroup[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getRoutineById(id), listGroups()]).then(([r, gs]) => {
        if (cancelled || !r) return;
        setRoutine(r);
        setTitle(r.title);
        setIcon((r.icon as FeatherName | null) ?? null);
        setGroupId(r.groupId);
        setGroups(gs);
      });
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  useEffect(() => {
    if (!routine) return;
    if (icon === routine.icon) return;
    updateRoutine(id, { icon });
  }, [icon, routine, id]);

  useEffect(() => {
    if (!routine || !groupId) return;
    if (groupId === routine.groupId) return;
    updateRoutine(id, { groupId });
  }, [groupId, routine, id]);

  const saveTitle = () => {
    if (!routine) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === routine.title) return;
    updateRoutine(id, { title: trimmed });
  };

  const handleArchive = () => {
    if (!routine) return;
    Alert.alert(
      'Archiver cette routine ?',
      'Les complétions passées sont conservées dans les stats.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Archiver',
          style: 'destructive',
          onPress: async () => {
            await archiveRoutine(id);
            router.back();
          },
        },
      ]
    );
  };

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === groupId) ?? null,
    [groups, groupId]
  );
  const iconColor = activeGroup?.color ?? theme.colors.routine;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 },
        titleInput: {
          fontSize: theme.font.xl,
          fontWeight: '700',
          color: theme.colors.text,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.md,
        },
        sectionLabel: {
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: theme.spacing.xl,
          marginBottom: theme.spacing.sm,
        },
        groupRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
        },
        groupChip: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: 6,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surfaceAlt,
        },
        groupChipText: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          fontWeight: '600',
        },
        groupChipTextActive: {
          color: theme.colors.textInverse,
        },
        archiveBtn: {
          marginTop: theme.spacing.xl * 2,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          gap: theme.spacing.sm,
        },
        archiveBtnText: {
          fontSize: theme.font.md,
          color: theme.colors.textMuted,
          fontWeight: '600',
        },
      }),
    [theme]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Routine',
          headerBackTitle: 'Retour',
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onBlur={saveTitle}
          style={styles.titleInput}
          placeholder="Titre"
          placeholderTextColor={theme.colors.textSubtle}
          returnKeyType="done"
        />

        <Text style={styles.sectionLabel}>Icône</Text>
        <IconPicker value={icon} onChange={setIcon} color={iconColor} />

        <Text style={styles.sectionLabel}>Groupe</Text>
        <View style={styles.groupRow}>
          {groups.map((g) => {
            const active = g.id === groupId;
            const chipColor = g.color ?? theme.colors.routine;
            return (
              <TouchableOpacity
                key={g.id}
                onPress={() => setGroupId(g.id)}
                style={[
                  styles.groupChip,
                  active && { backgroundColor: chipColor },
                ]}
              >
                <Text
                  style={[
                    styles.groupChipText,
                    active && styles.groupChipTextActive,
                  ]}
                >
                  {g.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={handleArchive} style={styles.archiveBtn}>
          <Feather name="archive" size={16} color={theme.colors.textMuted} />
          <Text style={styles.archiveBtnText}>Archiver cette routine</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
