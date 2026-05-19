import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HorizonTile from '@/components/objectives/HorizonTile';
import ObjectiveCreateModal from '@/components/objectives/ObjectiveCreateModal';
import ObjectivesFab from '@/components/objectives/ObjectivesFab';
import ObjectivesStatsHeader from '@/components/objectives/ObjectivesStatsHeader';
import ObjectivesTimelineArrow from '@/components/objectives/ObjectivesTimelineArrow';
import ObjectivesYearBrowserModal from '@/components/objectives/ObjectivesYearBrowserModal';
import UpcomingDeadlinesList from '@/components/objectives/UpcomingDeadlinesList';
import type { ObjectiveHorizon } from '@/db/objectives';
import { createObjective } from '@/data/mutations';
import { EMPTY_OBJECTIVES, objectivesView } from '@/data/views';
import { useTheme } from '@/lib/themeContext';

// Objectives overview. Stacked top-to-bottom for vertical scanning:
//
//   • StatsHeader      — "where am I" at a glance (done / overdue /
//                          this week). Single biggest infomration tile.
//   • UpcomingList     — "what's coming" — top 3 actionable deadlines.
//   • TimelineArrow    — "vision" — 30-year strip with red dots for
//                          long-term deadlines. Tap dot OR strip
//                          opens the year browser modal.
//   • 3 HorizonTiles   — drill-down access in a single row instead of
//                          the previous 3 stacked cards.
//
// + a floating FAB to add an objective from anywhere (horizon picker
// lives inside the create modal).
const HORIZON_PRIORITY: Record<ObjectiveHorizon, number> = {
  long: 0,
  medium: 1,
  short: 2,
};

export default function ObjectivesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const objectives = objectivesView.useView('_', EMPTY_OBJECTIVES);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserYear, setBrowserYear] = useState<number>(() =>
    new Date().getFullYear()
  );
  const [createOpen, setCreateOpen] = useState(false);

  const deadlinesByDay = useMemo(() => {
    const out = new Map<string, ObjectiveHorizon>();
    const consider = (list: typeof objectives.long) => {
      for (const o of list) {
        if (o.done || !o.deadline) continue;
        const existing = out.get(o.deadline);
        if (
          !existing ||
          HORIZON_PRIORITY[o.horizon] < HORIZON_PRIORITY[existing]
        ) {
          out.set(o.deadline, o.horizon);
        }
      }
    };
    consider(objectives.long);
    consider(objectives.medium);
    consider(objectives.short);
    return out;
  }, [objectives]);

  const longDeadlineYears = useMemo(() => {
    const out = new Set<number>();
    for (const o of objectives.long) {
      if (o.done || !o.deadline) continue;
      out.add(parseInt(o.deadline.slice(0, 4), 10));
    }
    return out;
  }, [objectives.long]);

  const deadlineCountByYear = useMemo(() => {
    const out = new Map<number, number>();
    for (const [dayKey] of deadlinesByDay) {
      const y = parseInt(dayKey.slice(0, 4), 10);
      out.set(y, (out.get(y) ?? 0) + 1);
    }
    return out;
  }, [deadlinesByDay]);

  const allObjectives = useMemo(
    () => [...objectives.long, ...objectives.medium, ...objectives.short],
    [objectives]
  );

  const handleSelectDay = useCallback(
    (dayKey: string) => {
      for (const h of ['long', 'medium', 'short'] as ObjectiveHorizon[]) {
        const match = objectives[h].find(
          (o) => !o.done && o.deadline === dayKey
        );
        if (match) {
          router.push(`/objectives/${match.id}`);
          return;
        }
      }
    },
    [objectives, router]
  );

  const handleOpenObjective = useCallback(
    (id: string) => {
      router.push(`/objectives/${id}`);
    },
    [router]
  );

  // Default landing year for the browser. If the user has long-term
  // deadlines, jump to the earliest one (most actionable); otherwise
  // current year.
  const openBrowserAtDefaultYear = useCallback(() => {
    const earliest = [...longDeadlineYears].sort()[0];
    setBrowserYear(earliest ?? new Date().getFullYear());
    setBrowserOpen(true);
  }, [longDeadlineYears]);

  const handleCreate = useCallback(
    (params: {
      title: string;
      description: string;
      deadline: string;
      horizon: ObjectiveHorizon;
    }) => {
      createObjective(params);
      setCreateOpen(false);
    },
    []
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scroll: {
          paddingBottom: 96, // breathing room above the FAB
        },
        tilesRow: {
          flexDirection: 'row',
          gap: theme.spacing.sm,
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.lg,
        },
      }),
    [theme]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Objectifs',
          headerBackTitle: 'Retour',
          headerTintColor: theme.colors.objectiveLong,
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ObjectivesStatsHeader objectives={allObjectives} />
        <UpcomingDeadlinesList
          objectives={allObjectives}
          limit={3}
          onOpenObjective={handleOpenObjective}
        />
        <ObjectivesTimelineArrow
          longDeadlineYears={longDeadlineYears}
          onTap={openBrowserAtDefaultYear}
        />
        <View style={styles.tilesRow}>
          <HorizonTile
            title="Long"
            accent={theme.colors.objectiveLong}
            objectives={objectives.long}
            onPress={() => router.push('/objectives/long')}
          />
          <HorizonTile
            title="Moyen"
            accent={theme.colors.objectiveMedium}
            objectives={objectives.medium}
            onPress={() => router.push('/objectives/medium')}
          />
          <HorizonTile
            title="Court"
            accent={theme.colors.objectiveShort}
            objectives={objectives.short}
            onPress={() => router.push('/objectives/short')}
          />
        </View>
      </ScrollView>
      <ObjectivesFab onPress={() => setCreateOpen(true)} />
      <ObjectivesYearBrowserModal
        visible={browserOpen}
        initialYear={browserYear}
        deadlinesByDay={deadlinesByDay}
        deadlineCountByYear={deadlineCountByYear}
        onClose={() => setBrowserOpen(false)}
        onSelectDay={handleSelectDay}
      />
      <ObjectiveCreateModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </SafeAreaView>
  );
}
