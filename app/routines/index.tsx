import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DragHandle from '@/components/DragHandle';
import RoutinesModalSheet, {
  type RoutinesModalState,
} from '@/components/RoutinesModalSheet';
import RoutineStatsCard from '@/components/RoutineStatsCard';
import type { Routine, RoutineGroup } from '@/db/routines';
import {
  archiveRoutine,
  createGroup,
  createRoutine,
  deleteGroup,
  updateGroup,
} from '@/data/mutations';
import { EMPTY_STRUCTURE, routineStructureView } from '@/data/views';
import { useActiveGroupId } from '@/hooks/useActiveGroupId';
import { toDayKey } from '@/lib/date';
import { useTheme } from '@/lib/themeContext';

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

type Props = {
  // Hub mode: when true, skip Stack.Screen and route the encoche swipe
  // through onSwipeUp callback instead of router.replace.
  hubMode?: boolean;
  onSwipeUp?: () => void;
};

export default function RoutinesTrackerScreen({
  hubMode,
  onSwipeUp,
}: Props = {}) {
  const { theme } = useTheme();
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDayKey(today), [today]);
  const { start: monthStart, end: monthEnd } = useMemo(
    () => monthBounds(today),
    [today]
  );

  const structure = routineStructureView.useView('_', EMPTY_STRUCTURE);
  const { groups, routinesByGroup } = structure;

  const [activeGroupId, selectActiveGroup] = useActiveGroupId(groups);

  const [modal, setModal] = useState<RoutinesModalState>(null);
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

  const activeIndex = useMemo(() => {
    if (!activeGroupId) return 0;
    const i = groups.findIndex((g) => g.id === activeGroupId);
    return i >= 0 ? i : 0;
  }, [groups, activeGroupId]);

  // Tapping a chip drives the scroll itself (animated). Without this
  // guard, selectActiveGroup would also re-fire the useEffect below and
  // snap the pager (animated:false) before the animation could run —
  // visible as a "jump" right after the tap.
  const suppressNextSnap = useRef(false);

  useEffect(() => {
    if (suppressNextSnap.current) {
      suppressNextSnap.current = false;
      return;
    }
    pagerRef.current?.scrollToOffset({
      offset: activeIndex * width,
      animated: false,
    });
  }, [activeIndex, width, groups.length]);

  const handleSelectGroup = useCallback(
    (groupId: string) => {
      const idx = groups.findIndex((g) => g.id === groupId);
      if (idx < 0) return;
      suppressNextSnap.current = true;
      selectActiveGroup(groupId);
      pagerRef.current?.scrollToOffset({
        offset: idx * width,
        animated: true,
      });
    },
    [groups, width, selectActiveGroup]
  );

  const handlePagerEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      const g = groups[idx];
      if (g && g.id !== activeGroupId) {
        suppressNextSnap.current = true;
        selectActiveGroup(g.id);
      }
    },
    [groups, width, activeGroupId, selectActiveGroup]
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
              }
            },
          },
          { text: 'Annuler', style: 'cancel' },
        ],
        { cancelable: true }
      );
    },
    []
  );

  const handleArchiveRoutine = useCallback((routine: Routine) => {
    Alert.alert(
      'Archiver cette routine ?',
      `« ${routine.title} » ne s'affichera plus, mais les complétions passées sont conservées dans les stats.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Archiver',
          style: 'destructive',
          onPress: () => archiveRoutine(routine.id),
        },
      ]
    );
  }, []);

  const closeModal = useCallback(() => {
    // Dismissing the keyboard before unmounting the Modal contents avoids
    // a stale-focus state on Android where the next open keeps the IME
    // anchored on a TextInput that no longer exists in the tree.
    Keyboard.dismiss();
    setModal(null);
  }, []);

  const submitModal = useCallback(async () => {
    if (!modal) return;
    if (modal.type === 'create-group') {
      const trimmed = modal.name.trim();
      if (!trimmed) {
        closeModal();
        return;
      }
      const g = await createGroup(trimmed, modal.color);
      closeModal();
      selectActiveGroup(g.id);
    } else if (modal.type === 'rename-group') {
      const trimmed = modal.name.trim();
      if (!trimmed) {
        closeModal();
        return;
      }
      await updateGroup(modal.id, { name: trimmed, color: modal.color });
      closeModal();
    } else if (modal.type === 'create-routine') {
      const trimmed = modal.name.trim();
      if (!trimmed || !activeGroupId) {
        closeModal();
        return;
      }
      await createRoutine({ groupId: activeGroupId, title: trimmed });
      closeModal();
    }
  }, [modal, activeGroupId, closeModal, selectActiveGroup]);

  // FlatList ignores prop changes outside `data` unless `extraData` flips.
  // Adding a routine changes routinesByGroup but leaves `data` (groups)
  // intact → without this, the freshly added card stays invisible until
  // something forces a re-render. Cards subscribe to their own stats /
  // completions, so those don't need to participate in extraData.
  const pagerExtraData = useMemo(
    () => ({ routinesByGroup, expandedRoutineIds }),
    [routinesByGroup, expandedRoutineIds]
  );

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
        hubTitle: {
          fontSize: theme.font.xl,
          fontWeight: '700',
          color: theme.colors.text,
          textAlign: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.sm,
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
          bottom: theme.spacing.lg * 2 + 40,
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
          elevation: 8,
          zIndex: 10,
        },
      }),
    [theme]
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={hubMode ? ['top', 'bottom'] : ['bottom']}
    >
      {!hubMode ? (
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Routines',
            headerBackTitle: 'Retour',
            animation: 'none',
          }}
        />
      ) : null}

      {hubMode ? (
        <Text style={styles.hubTitle}>Routines</Text>
      ) : null}

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
        extraData={pagerExtraData}
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
                groupRoutines.map((r) => (
                  <RoutineStatsCard
                    key={r.id}
                    routine={r}
                    groupColor={groupColor}
                    todayKey={todayKey}
                    monthStart={monthStart}
                    monthEnd={monthEnd}
                    todayYear={today.getFullYear()}
                    todayMonth={today.getMonth()}
                    expanded={expandedRoutineIds.has(r.id)}
                    onToggleExpanded={toggleExpanded}
                    onEdit={(id) => router.push(`/routines/${id}`)}
                    onArchive={handleArchiveRoutine}
                  />
                ))
              )}
            </ScrollView>
          );
        }}
      />

      <DragHandle
        direction="up"
        onTrigger={() => {
          // Always land on TODAY's real date, regardless of when the
          // screen mounted or what's on the back stack. router.back()
          // would return to whatever day the user came from.
          if (onSwipeUp) onSwipeUp();
          else router.replace(`/calendar/${toDayKey(new Date())}`);
        }}
        label="Jour"
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

      <RoutinesModalSheet
        modal={modal}
        kbHeight={kbHeight}
        onChange={setModal}
        onClose={closeModal}
        onSubmit={submitModal}
      />
    </SafeAreaView>
  );
}
