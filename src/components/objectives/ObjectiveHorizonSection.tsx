import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ObjectiveRow from '@/components/objectives/ObjectiveRow';
import type { Objective, ObjectiveHorizon } from '@/db/objectives';
import { softColorBg } from '@/lib/colors';
import { useTheme } from '@/lib/themeContext';

type Props = {
  horizon: ObjectiveHorizon;
  title: string;
  accent: string;
  objectives: Objective[];
  onToggle: (id: string, nextDone: boolean) => void;
  onOpen: (id: string) => void;
  // Open the create modal — section no longer creates inline because
  // the project rule requires title + description + deadline at
  // creation time (cf. CLAUDE.md §11).
  onRequestAdd: () => void;
};

// One coloured horizon block. Header counter + rows + "+ Ajouter" CTA
// that opens the parent's create modal.
export default function ObjectiveHorizonSection({
  horizon,
  title,
  accent,
  objectives,
  onToggle,
  onOpen,
  onRequestAdd,
}: Props) {
  const { theme } = useTheme();

  const softBg =
    softColorBg(accent, theme.colors.background, 0.1) ?? theme.colors.surfaceAlt;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          backgroundColor: softBg,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.xs,
          marginBottom: theme.spacing.sm,
        },
        title: {
          fontSize: theme.font.sm,
          fontWeight: '700',
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        counter: {
          fontSize: theme.font.xs,
          fontWeight: '700',
          color: accent,
          letterSpacing: 0.5,
        },
        empty: {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          alignItems: 'center',
        },
        emptyText: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          textAlign: 'center',
        },
        addBtn: {
          marginTop: theme.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          paddingVertical: theme.spacing.md,
          backgroundColor: accent,
          borderRadius: theme.radius.md,
        },
        addBtnText: {
          fontSize: theme.font.md,
          fontWeight: '700',
          color: theme.colors.textInverse,
        },
      }),
    [theme, accent, softBg]
  );

  const total = objectives.length;
  const done = objectives.filter((o) => o.done).length;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {total > 0 ? (
          <Text style={styles.counter}>
            {done}/{total}
          </Text>
        ) : null}
      </View>
      {objectives.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Aucun objectif {horizon === 'long' ? 'long' : horizon === 'medium' ? 'moyen' : 'court'} terme.
          </Text>
        </View>
      ) : (
        objectives.map((o) => (
          <ObjectiveRow
            key={o.id}
            objective={o}
            accent={accent}
            onToggle={onToggle}
            onPress={onOpen}
          />
        ))
      )}
      <TouchableOpacity
        onPress={onRequestAdd}
        style={styles.addBtn}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={18} color={theme.colors.textInverse} />
        <Text style={styles.addBtnText}>Ajouter un objectif</Text>
      </TouchableOpacity>
    </View>
  );
}
