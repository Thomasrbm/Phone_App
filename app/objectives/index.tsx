import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ObjectiveHorizonSection from '@/components/objectives/ObjectiveHorizonSection';
import type { ObjectiveHorizon } from '@/db/objectives';
import { createObjective, toggleObjectiveDone } from '@/data/mutations';
import { EMPTY_OBJECTIVES, objectivesView } from '@/data/views';
import { useTheme } from '@/lib/themeContext';

// Single-screen view of every objective, grouped by horizon. Order is
// long → medium → short on purpose: long terme is the most important
// framing ("où est-ce que je vais") and sits at the top.
export default function ObjectivesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const objectives = objectivesView.useView('_', EMPTY_OBJECTIVES);

  const handleToggle = useCallback((id: string, nextDone: boolean) => {
    toggleObjectiveDone(id, nextDone);
  }, []);

  const handleOpen = useCallback(
    (id: string) => {
      router.push(`/objectives/${id}`);
    },
    [router]
  );

  const makeHandleAdd = useCallback(
    (horizon: ObjectiveHorizon) => (title: string) => {
      createObjective({ title, horizon });
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
          Tes objectifs personnels, classés par horizon. Indépendants du jour.
        </Text>
        <ObjectiveHorizonSection
          horizon="long"
          title="Long terme"
          accent={theme.colors.objectiveLong}
          objectives={objectives.long}
          onToggle={handleToggle}
          onOpen={handleOpen}
          onAdd={makeHandleAdd('long')}
        />
        <ObjectiveHorizonSection
          horizon="medium"
          title="Moyen terme"
          accent={theme.colors.objectiveMedium}
          objectives={objectives.medium}
          onToggle={handleToggle}
          onOpen={handleOpen}
          onAdd={makeHandleAdd('medium')}
        />
        <ObjectiveHorizonSection
          horizon="short"
          title="Court terme"
          accent={theme.colors.objectiveShort}
          objectives={objectives.short}
          onToggle={handleToggle}
          onOpen={handleOpen}
          onAdd={makeHandleAdd('short')}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
