import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HorizonSummaryCard from '@/components/objectives/HorizonSummaryCard';
import ObjectivesYearView from '@/components/objectives/ObjectivesYearView';
import type { ObjectiveHorizon } from '@/db/objectives';
import { EMPTY_OBJECTIVES, objectivesView } from '@/data/views';
import { useTheme } from '@/lib/themeContext';

// Overview screen: read-only summary + year-view. Every interaction
// (add / edit / check / delete) lives behind the per-horizon sub-pages
// (/objectives/long, /medium, /short) or the per-objective edit screen
// (/objectives/[id]). This page never mutates.
//
// Long takes precedence in the year view (visually loudest) when
// multiple horizons share a deadline day.
const HORIZON_PRIORITY: Record<ObjectiveHorizon, number> = {
  long: 0,
  medium: 1,
  short: 2,
};

export default function ObjectivesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const objectives = objectivesView.useView('_', EMPTY_OBJECTIVES);

  // Build a map from dayKey to the most-urgent horizon with a deadline
  // there. Skips done objectives (no point flagging completed work
  // visually).
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

  // Tap a deadline cell → open the (first) objective that has that
  // deadline. Priority again: long → medium → short.
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
          Aperçu de tes objectifs. Appuie sur une carte pour ouvrir, éditer ou
          ajouter.
        </Text>
        <ObjectivesYearView
          deadlinesByDay={deadlinesByDay}
          onSelectDay={handleSelectDay}
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
    </SafeAreaView>
  );
}
