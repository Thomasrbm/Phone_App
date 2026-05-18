import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HorizonSummaryCard from '@/components/objectives/HorizonSummaryCard';
import ObjectivesTimelineArrow from '@/components/objectives/ObjectivesTimelineArrow';
import ObjectivesYearPickerModal from '@/components/objectives/ObjectivesYearPickerModal';
import ObjectivesYearView from '@/components/objectives/ObjectivesYearView';
import type { ObjectiveHorizon } from '@/db/objectives';
import { EMPTY_OBJECTIVES, objectivesView } from '@/data/views';
import { useTheme } from '@/lib/themeContext';

// Overview screen: timeline arrow (long-term only) + 3 tappable
// horizon summary cards. Tap the timeline → opens a year picker.
// Pick a year → year detail view appears (all horizons, not just
// long).
//
// Read-only. Every mutation (add / edit / check / delete) lives
// behind the per-horizon sub-pages (/objectives/long, /medium,
// /short) or the per-objective edit screen (/objectives/[id]).
const HORIZON_PRIORITY: Record<ObjectiveHorizon, number> = {
  long: 0,
  medium: 1,
  short: 2,
};

export default function ObjectivesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const objectives = objectivesView.useView('_', EMPTY_OBJECTIVES);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Map from dayKey → most-urgent horizon, fed to the year view.
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

  // Years with at least one long-term deadline (timeline shows only
  // long terme — the user's mental model: the arrow is the strategic
  // horizon, the year view is where the tactical layers surface).
  const longDeadlineYears = useMemo(() => {
    const out = new Set<number>();
    for (const o of objectives.long) {
      if (o.done || !o.deadline) continue;
      out.add(parseInt(o.deadline.slice(0, 4), 10));
    }
    return out;
  }, [objectives.long]);

  // Per-year deadline counts (all horizons) for the picker meta.
  const deadlineCountByYear = useMemo(() => {
    const out = new Map<number, number>();
    for (const [dayKey] of deadlinesByDay) {
      const y = parseInt(dayKey.slice(0, 4), 10);
      out.set(y, (out.get(y) ?? 0) + 1);
    }
    return out;
  }, [deadlinesByDay]);

  // Tap a deadline cell in the year view → open the (first) objective
  // that has that deadline. Long → medium → short priority.
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
          Aperçu de tes objectifs. Appuie sur une carte d&apos;horizon pour
          gérer, ou sur la frise pour zoomer sur une année.
        </Text>
        <ObjectivesTimelineArrow
          longDeadlineYears={longDeadlineYears}
          onTap={() => setPickerOpen(true)}
        />
        {selectedYear !== null ? (
          <ObjectivesYearView
            year={selectedYear}
            deadlinesByDay={deadlinesByDay}
            onSelectDay={handleSelectDay}
          />
        ) : null}
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
      <ObjectivesYearPickerModal
        visible={pickerOpen}
        selectedYear={selectedYear}
        deadlineCountByYear={deadlineCountByYear}
        onClose={() => setPickerOpen(false)}
        onPick={(y) => {
          setSelectedYear(y);
          setPickerOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
