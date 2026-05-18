import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ObjectiveCreateModal from '@/components/objectives/ObjectiveCreateModal';
import ObjectiveHorizonSection from '@/components/objectives/ObjectiveHorizonSection';
import type { ObjectiveHorizon } from '@/db/objectives';
import { createObjective, toggleObjectiveDone } from '@/data/mutations';
import { EMPTY_OBJECTIVES, objectivesView } from '@/data/views';
import { useTheme } from '@/lib/themeContext';

type Props = {
  horizon: ObjectiveHorizon;
};

const TITLES: Record<ObjectiveHorizon, string> = {
  long: 'Long terme',
  medium: 'Moyen terme',
  short: 'Court terme',
};

// Dedicated screen for one horizon. Renders the horizon's section
// + manages the create modal that enforces title + description +
// deadline at creation time.
export default function HorizonScreen({ horizon }: Props) {
  const { theme } = useTheme();
  const router = useRouter();
  const objectives = objectivesView.useView('_', EMPTY_OBJECTIVES);
  const [createOpen, setCreateOpen] = useState(false);

  const accent =
    horizon === 'long'
      ? theme.colors.objectiveLong
      : horizon === 'medium'
        ? theme.colors.objectiveMedium
        : theme.colors.objectiveShort;

  const handleToggle = useCallback((id: string, nextDone: boolean) => {
    toggleObjectiveDone(id, nextDone);
  }, []);

  const handleOpen = useCallback(
    (id: string) => {
      router.push(`/objectives/${id}`);
    },
    [router]
  );

  const handleCreate = useCallback(
    (params: { title: string; description: string; deadline: string }) => {
      createObjective({ ...params, horizon });
      setCreateOpen(false);
    },
    [horizon]
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
      }),
    [theme]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: TITLES[horizon],
          headerBackTitle: 'Retour',
          headerTintColor: accent,
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ObjectiveHorizonSection
          horizon={horizon}
          title={TITLES[horizon]}
          accent={accent}
          objectives={objectives[horizon]}
          onToggle={handleToggle}
          onOpen={handleOpen}
          onRequestAdd={() => setCreateOpen(true)}
        />
      </ScrollView>
      <ObjectiveCreateModal
        visible={createOpen}
        horizon={horizon}
        accent={accent}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </SafeAreaView>
  );
}
