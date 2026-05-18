import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HorizonSummaryCard from '@/components/objectives/HorizonSummaryCard';
import ObjectivesTimelineArrow from '@/components/objectives/ObjectivesTimelineArrow';
import ObjectivesYearBrowserModal from '@/components/objectives/ObjectivesYearBrowserModal';
import UpcomingDeadlinesList from '@/components/objectives/UpcomingDeadlinesList';
import type { ObjectiveHorizon } from '@/db/objectives';
import { EMPTY_OBJECTIVES, objectivesView } from '@/data/views';
import { useTheme } from '@/lib/themeContext';

// Overview screen. Read-only — every mutation lives behind the per-
// horizon sub-pages or the per-objective edit screen.
//
// Layout, top to bottom:
//   1. Upcoming deadlines (next 5 across all horizons, sorted by date)
//   2. Long-term timeline (vision 30 years, red dots only)
//   3. Three horizon summary cards (tappable → drill-in)
//
// Tap timeline → opens a full-screen year browser modal. Closing the
// modal drops the year detail completely (no lingering inline view).
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
  // Year to land on when the browser opens. Drives initialYear of the
  // modal; the modal copies it into local state and lets the user nav
  // from there.
  const [browserYear, setBrowserYear] = useState<number>(() =>
    new Date().getFullYear()
  );

  // Map dayKey → most-urgent horizon, fed to the year view inside
  // the browser.
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

  // Years with at least one *long-term* deadline (timeline scope).
  const longDeadlineYears = useMemo(() => {
    const out = new Set<number>();
    for (const o of objectives.long) {
      if (o.done || !o.deadline) continue;
      out.add(parseInt(o.deadline.slice(0, 4), 10));
    }
    return out;
  }, [objectives.long]);

  // Per-year deadline count (all horizons) for the picker meta.
  const deadlineCountByYear = useMemo(() => {
    const out = new Map<number, number>();
    for (const [dayKey] of deadlinesByDay) {
      const y = parseInt(dayKey.slice(0, 4), 10);
      out.set(y, (out.get(y) ?? 0) + 1);
    }
    return out;
  }, [deadlinesByDay]);

  // Flat list of every non-done objective, fed to the upcoming list.
  const allObjectives = useMemo(
    () => [...objectives.long, ...objectives.medium, ...objectives.short],
    [objectives]
  );

  // Tap a deadline cell inside the year view → open the (first)
  // matching objective. Closes the browser as a side effect.
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

  const openBrowser = useCallback(() => {
    // Land on the current year by default — the user can navigate
    // from there.
    setBrowserYear(new Date().getFullYear());
    setBrowserOpen(true);
  }, []);

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
        intro: {
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
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
        <Text style={styles.intro}>
          Aperçu de tes objectifs. Appuie sur une carte pour gérer.
        </Text>
        <UpcomingDeadlinesList
          objectives={allObjectives}
          onOpenObjective={handleOpenObjective}
        />
        <ObjectivesTimelineArrow
          longDeadlineYears={longDeadlineYears}
          onTap={openBrowser}
        />
        <HorizonSummaryCard
          title="Long terme"
          accent={theme.colors.objectiveLong}
          objectives={objectives.long}
          onPress={() => router.push('/objectives/long')}
        />
        <HorizonSummaryCard
          title="Moyen terme"
          accent={theme.colors.objectiveMedium}
          objectives={objectives.medium}
          onPress={() => router.push('/objectives/medium')}
        />
        <HorizonSummaryCard
          title="Court terme"
          accent={theme.colors.objectiveShort}
          objectives={objectives.short}
          onPress={() => router.push('/objectives/short')}
        />
      </ScrollView>
      <ObjectivesYearBrowserModal
        visible={browserOpen}
        initialYear={browserYear}
        deadlinesByDay={deadlinesByDay}
        deadlineCountByYear={deadlineCountByYear}
        onClose={() => setBrowserOpen(false)}
        onSelectDay={handleSelectDay}
      />
    </SafeAreaView>
  );
}
