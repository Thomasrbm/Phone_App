import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DragHandle from '@/components/DragHandle';
import RoutineMonthHeatmap from '@/components/RoutineMonthHeatmap';
import RoutineWeekStrip from '@/components/RoutineWeekStrip';
import {
  archiveRoutine,
  createGroup,
  createRoutine,
  deleteGroup,
  getCompletionDaysForRoutine,
  getRoutineStats,
  listGroups,
  listRoutinesByGroup,
  updateGroup,
  type Routine,
  type RoutineGroup,
  type RoutineStats,
} from '@/db/routines';
import { getSetting, setSetting } from '@/db/settings';
import { TASK_COLORS } from '@/lib/colors';
import { toDayKey } from '@/lib/date';
import type { FeatherName } from '@/lib/icons';
import { useTheme } from '@/lib/themeContext';

const ACTIVE_GROUP_KEY = 'routines_active_group';

type ModalState =
  | { type: 'create-group'; name: string; color: string | null }
  | {
      type: 'rename-group';
      id: string;
      name: string;
      color: string | null;
    }
  | { type: 'create-routine'; name: string }
  | null;

function monthBounds(d: Date): { start: string; end: string } {
  const y = d.getFullYear();
  const m = d.getMonth();
  // Reach 7 days before this month so the weekly strip stays correct
  // when the current Mon-Sun week spills into the previous month.
  const first = new Date(y, m, 1);
  first.setDate(first.getDate() - 7);
  const last = new Date(y, m + 1, 0);
  return { start: toDayKey(first), end: toDayKey(last) };
}

export default function RoutinesTrackerScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDayKey(today), [today]);
  const { start: monthStart, end: monthEnd } = useMemo(
    () => monthBounds(today),
    [today]
  );

  const [groups, setGroups] = useState<RoutineGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [routinesByGroup, setRoutinesByGroup] = useState<
    Record<string, Routine[]>
  >({});
  const [stats, setStats] = useState<Record<string, RoutineStats>>({});
  const [completions, setCompletions] = useState<Record<string, Set<string>>>(
    {}
  );
  const [modal, setModal] = useState<ModalState>(null);
  const [kbHeight, setKbHeight] = useState(0);
  const [expandedRoutineIds, setExpandedRoutineIds] = useState<Set<string>>(
    new Set()
  );
  const { width } = useWindowDimensions();
  const pagerRef = useRef<FlatList<RoutineGroup>>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedRoutineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Manual keyboard offset for the modal sheet. Android Modal lives in
  // its own window where windowSoftInputMode doesn't lift the content,
  // and KeyboardAvoidingView behaves inconsistently inside Modal —
  // tracking the height ourselves and applying it as marginBottom is
  // the reliable path.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) =>
      setKbHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const reload = useCallback(async () => {
    const [allGroups, storedActive] = await Promise.all([
      listGroups(),
      getSetting(ACTIVE_GROUP_KEY),
    ]);
    setGroups(allGroups);
    const fallback = allGroups[0]?.id ?? null;
    const active =
      storedActive && allGroups.some((g) => g.id === storedActive)
        ? storedActive
        : fallback;
    setActiveGroupId(active);

    // Load all groups' routines + their stats + completions in parallel.
    // Keeps the horizontal pager responsive when swiping between groups.
    const allLists = await Promise.all(
      allGroups.map((g) => listRoutinesByGroup(g.id))
    );
    const routinesMap: Record<string, Routine[]> = {};
    allGroups.forEach((g, i) => {
      routinesMap[g.id] = allLists[i];
    });
    setRoutinesByGroup(routinesMap);
    const flat = allLists.flat();
    const [statsList, completionsList] = await Promise.all([
      Promise.all(flat.map((r) => getRoutineStats(r.id, todayKey))),
      Promise.all(
        flat.map((r) =>
          getCompletionDaysForRoutine(r.id, monthStart, monthEnd)
        )
      ),
    ]);
    const statsMap: Record<string, RoutineStats> = {};
    const compMap: Record<string, Set<string>> = {};
    flat.forEach((r, i) => {
      statsMap[r.id] = statsList[i];
      compMap[r.id] = completionsList[i];
    });
    setStats(statsMap);
    setCompletions(compMap);
  }, [todayKey, monthStart, monthEnd]);

  const activeIndex = useMemo(() => {
    if (!activeGroupId) return 0;
    const i = groups.findIndex((g) => g.id === activeGroupId);
    return i >= 0 ? i : 0;
  }, [groups, activeGroupId]);

  useEffect(() => {
    pagerRef.current?.scrollToOffset({
      offset: activeIndex * width,
      animated: false,
    });
  }, [activeIndex, width, groups.length]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleSelectGroup = useCallback(
    async (groupId: string, scroll = true) => {
      setActiveGroupId(groupId);
      await setSetting(ACTIVE_GROUP_KEY, groupId);
      if (scroll) {
        const idx = groups.findIndex((g) => g.id === groupId);
        if (idx >= 0) {
          pagerRef.current?.scrollToOffset({
            offset: idx * width,
            animated: true,
          });
        }
      }
    },
    [groups, width]
  );

  const handlePagerEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      const g = groups[idx];
      if (g && g.id !== activeGroupId) {
        setActiveGroupId(g.id);
        setSetting(ACTIVE_GROUP_KEY, g.id);
      }
    },
    [groups, width, activeGroupId]
  );

  const handleGroupLongPress = useCallback(
    (group: RoutineGroup) => {
      Alert.alert(
        group.name,
        undefined,
        [
          {
            text: 'Modifier',
            onPress: () =>
              setModal({
                type: 'rename-group',
                id: group.id,
                name: group.name,
                color: group.color,
              }),
          },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              const res = await deleteGroup(group.id);
              if (!res.ok) {
                Alert.alert(
                  'Impossible',
                  res.reason === 'last_group'
                    ? 'Tu dois garder au moins un groupe.'
                    : `Ce groupe contient ${res.routineCount} routine${res.routineCount > 1 ? 's' : ''}. Déplace ou archive-les d'abord.`
                );
                return;
              }
              reload();
            },
          },
          { text: 'Annuler', style: 'cancel' },
        ],
        { cancelable: true }
      );
    },
    [reload]
  );

  const handleArchiveRoutine = useCallback(
    (routine: Routine) => {
      Alert.alert(
        'Archiver cette routine ?',
        `« ${routine.title} » ne s'affichera plus, mais les complétions passées sont conservées dans les stats.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Archiver',
            style: 'destructive',
            onPress: async () => {
              await archiveRoutine(routine.id);
              await reload();
            },
          },
        ]
      );
    },
    [reload]
  );

  const submitModal = useCallback(async () => {
    if (!modal) return;
    if (modal.type === 'create-group') {
      const trimmed = modal.name.trim();
      if (!trimmed) {
        setModal(null);
        return;
      }
      const g = await createGroup(trimmed, modal.color);
      setModal(null);
      await setSetting(ACTIVE_GROUP_KEY, g.id);
      setActiveGroupId(g.id);
      await reload();
    } else if (modal.type === 'rename-group') {
      const trimmed = modal.name.trim();
      if (!trimmed) {
        setModal(null);
        return;
      }
      await updateGroup(modal.id, { name: trimmed, color: modal.color });
      setModal(null);
      reload();
    } else if (modal.type === 'create-routine') {
      const trimmed = modal.name.trim();
      if (!trimmed || !activeGroupId) {
        setModal(null);
        return;
      }
      await createRoutine({ groupId: activeGroupId, title: trimmed });
      setModal(null);
      await reload();
    }
  }, [modal, activeGroupId, reload]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scroll: {
          paddingBottom: theme.spacing.xl * 3,
        },
        tabsWrap: {
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
        tabs: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        chip: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: 6,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surfaceAlt,
          marginRight: theme.spacing.sm,
        },
        chipActive: {
          backgroundColor: theme.colors.routine,
        },
        chipText: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          fontWeight: '600',
        },
        chipTextActive: {
          color: theme.colors.textInverse,
        },
        addGroupBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        sectionLabel: {
          fontSize: theme.font.xs,
          fontWeight: '700',
          color: theme.colors.textSubtle,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.sm,
        },
        card: {
          marginHorizontal: theme.spacing.lg,
          marginBottom: theme.spacing.md,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceAlt,
        },
        cardHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.sm,
        },
        colorDot: {
          width: 10,
          height: 10,
          borderRadius: 5,
          marginRight: theme.spacing.sm,
        },
        cardIcon: {
          width: 22,
          height: 22,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.sm,
        },
        cardFooter: {
          marginTop: theme.spacing.sm,
          alignItems: 'center',
        },
        cardTitle: {
          flex: 1,
          fontSize: theme.font.lg,
          fontWeight: '700',
          color: theme.colors.text,
        },
        archiveBtn: {
          padding: 6,
        },
        statsRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.xs,
        },
        statBlock: {
          flex: 1,
        },
        statLabel: {
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        statValue: {
          fontSize: theme.font.xl,
          fontWeight: '800',
          color: theme.colors.text,
          marginTop: 2,
        },
        statValueAccent: {
          color: theme.colors.routine,
        },
        empty: {
          padding: theme.spacing.xl,
          alignItems: 'center',
        },
        emptyText: {
          fontSize: theme.font.md,
          color: theme.colors.textMuted,
          textAlign: 'center',
        },
        emptyHint: {
          fontSize: theme.font.sm,
          color: theme.colors.textSubtle,
          marginTop: theme.spacing.sm,
        },
        fab: {
          position: 'absolute',
          right: theme.spacing.lg,
          bottom: theme.spacing.lg,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.colors.routine,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 4,
          elevation: 4,
        },
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'flex-end',
        },
        modalSheet: {
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        },
        modalTitle: {
          fontSize: theme.font.lg,
          fontWeight: '700',
          color: theme.colors.text,
          marginBottom: theme.spacing.md,
        },
        modalInput: {
          fontSize: theme.font.lg,
          color: theme.colors.text,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.md,
          marginBottom: theme.spacing.lg,
        },
        modalColorLabel: {
          fontSize: theme.font.xs,
          fontWeight: '700',
          color: theme.colors.textSubtle,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: theme.spacing.sm,
        },
        modalColorRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.lg,
        },
        modalColorChip: {
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        },
        modalColorChipSelected: {
          borderColor: theme.colors.text,
        },
        modalColorChipEmpty: {
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
        modalActions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: theme.spacing.md,
        },
        modalBtn: {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.md,
        },
        modalBtnPrimary: {
          backgroundColor: theme.colors.routine,
        },
        modalBtnText: {
          fontSize: theme.font.md,
          fontWeight: '600',
          color: theme.colors.textMuted,
        },
        modalBtnTextPrimary: {
          color: theme.colors.textInverse,
        },
      }),
    [theme]
  );

  const modalTitle = useMemo(() => {
    if (!modal) return '';
    if (modal.type === 'create-group') return 'Nouveau groupe';
    if (modal.type === 'rename-group') return 'Renommer le groupe';
    return 'Nouvelle routine';
  }, [modal]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Routines',
          headerBackTitle: 'Retour',
        }}
      />

      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabs}>
            {groups.map((g) => {
              const active = g.id === activeGroupId;
              const chipColor = g.color ?? theme.colors.routine;
              return (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => handleSelectGroup(g.id)}
                  onLongPress={() => handleGroupLongPress(g)}
                  delayLongPress={350}
                  style={[
                    styles.chip,
                    active && { backgroundColor: chipColor },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {g.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={() =>
                setModal({ type: 'create-group', name: '', color: null })
              }
              style={styles.addGroupBtn}
              hitSlop={8}
            >
              <Feather name="plus" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <FlatList
        ref={pagerRef}
        style={{ flex: 1 }}
        data={groups}
        keyExtractor={(g) => g.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        initialScrollIndex={activeIndex}
        onMomentumScrollEnd={handlePagerEnd}
        renderItem={({ item: group }) => {
          const groupRoutines = routinesByGroup[group.id] ?? [];
          const groupColor = group.color ?? theme.colors.routine;
          return (
            <ScrollView
              style={{ width }}
              contentContainerStyle={styles.scroll}
            >
              {groupRoutines.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>
                    Aucune routine dans ce groupe.
                  </Text>
                  <Text style={styles.emptyHint}>
                    Appuie sur + en bas pour en créer une.
                  </Text>
                </View>
              ) : (
                groupRoutines.map((r) => {
                  const s = stats[r.id];
                  const c = completions[r.id] ?? new Set<string>();
                  const iconName = (r.icon as FeatherName | null) ?? null;
                  const expanded = expandedRoutineIds.has(r.id);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => toggleExpanded(r.id)}
                      activeOpacity={0.7}
                      style={styles.card}
                    >
                      <View style={styles.cardHeader}>
                        {iconName ? (
                          <View style={styles.cardIcon}>
                            <Feather
                              name={iconName}
                              size={18}
                              color={groupColor}
                            />
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.colorDot,
                              { backgroundColor: groupColor },
                            ]}
                          />
                        )}
                        <Text style={styles.cardTitle}>{r.title}</Text>
                        <TouchableOpacity
                          onPress={() => router.push(`/routines/${r.id}`)}
                          hitSlop={8}
                          style={styles.archiveBtn}
                        >
                          <Feather
                            name="edit-2"
                            size={16}
                            color={theme.colors.textMuted}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleArchiveRoutine(r)}
                          hitSlop={8}
                          style={styles.archiveBtn}
                        >
                          <Feather
                            name="archive"
                            size={16}
                            color={theme.colors.textMuted}
                          />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.statsRow}>
                        <View style={styles.statBlock}>
                          <Text style={styles.statLabel}>Streak</Text>
                          <Text
                            style={[
                              styles.statValue,
                              { color: groupColor },
                            ]}
                          >
                            {s?.streak ?? 0}j
                          </Text>
                        </View>
                        <View style={styles.statBlock}>
                          <Text style={styles.statLabel}>30 derniers j.</Text>
                          <Text style={styles.statValue}>
                            {s ? Math.round(s.ratio30d * 100) : 0}%
                          </Text>
                        </View>
                        <View style={styles.statBlock}>
                          <Text style={styles.statLabel}>Complétions</Text>
                          <Text style={styles.statValue}>
                            {s?.completed30d ?? 0}
                          </Text>
                        </View>
                      </View>
                      {expanded ? (
                        <RoutineMonthHeatmap
                          year={today.getFullYear()}
                          month={today.getMonth()}
                          completedDays={c}
                          color={groupColor}
                          todayKey={todayKey}
                        />
                      ) : (
                        <RoutineWeekStrip
                          todayKey={todayKey}
                          completedDays={c}
                          color={groupColor}
                        />
                      )}
                      <View style={styles.cardFooter}>
                        <Feather
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={theme.colors.textMuted}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          );
        }}
      />

      {activeGroupId ? (
        <TouchableOpacity
          onPress={() => setModal({ type: 'create-routine', name: '' })}
          style={styles.fab}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={28} color={theme.colors.textInverse} />
        </TouchableOpacity>
      ) : null}

      <DragHandle
        direction="up"
        onTrigger={() => {
          // Always land on TODAY's real date, regardless of when the
          // screen mounted or what's on the back stack. router.back()
          // would return to whatever day the user came from.
          router.replace(`/calendar/${toDayKey(new Date())}`);
        }}
        label="Jour"
      />

      <Modal
        visible={modal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(null)}
        statusBarTranslucent
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModal(null)}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={{ marginBottom: kbHeight }}
          >
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TextInput
                value={modal?.name ?? ''}
                onChangeText={(v) =>
                  setModal((m) => (m ? { ...m, name: v } : m))
                }
                placeholder={
                  modal?.type === 'create-routine'
                    ? 'Titre de la routine…'
                    : 'Nom du groupe…'
                }
                placeholderTextColor={theme.colors.textSubtle}
                style={styles.modalInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={submitModal}
              />
              {modal &&
              (modal.type === 'create-group' ||
                modal.type === 'rename-group') ? (
                <>
                  <Text style={styles.modalColorLabel}>Couleur</Text>
                  <View style={styles.modalColorRow}>
                    {TASK_COLORS.map((c) => {
                      const selected = modal.color === c.value;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() =>
                            setModal((m) =>
                              m &&
                              (m.type === 'create-group' ||
                                m.type === 'rename-group')
                                ? { ...m, color: c.value }
                                : m
                            )
                          }
                          style={[
                            styles.modalColorChip,
                            c.value
                              ? { backgroundColor: c.value }
                              : styles.modalColorChipEmpty,
                            selected && styles.modalColorChipSelected,
                          ]}
                        >
                          {!c.value && selected ? (
                            <Feather
                              name="check"
                              size={14}
                              color={theme.colors.text}
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setModal(null)}
                  style={styles.modalBtn}
                >
                  <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submitModal}
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                >
                  <Text
                    style={[
                      styles.modalBtnText,
                      styles.modalBtnTextPrimary,
                    ]}
                  >
                    Valider
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
