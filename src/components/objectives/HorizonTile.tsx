import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Objective } from '@/db/objectives';
import { softColorBg } from '@/lib/colors';
import { useTheme } from '@/lib/themeContext';

type Props = {
  title: string;
  accent: string;
  objectives: Objective[];
  onPress: () => void;
};

// Compact square tile for one horizon. Three tiles fit in a row on
// phone width. Replaces the previous HorizonSummaryCard for the
// overview screen — the cards were too tall and ate scroll space
// while saying very little. Tiles compress to: counter (done/total)
// + next-deadline date + horizon name as the accent header. Tap →
// drill into the horizon page.
export default function HorizonTile({
  title,
  accent,
  objectives,
  onPress,
}: Props) {
  const { theme } = useTheme();

  const total = objectives.length;
  const done = objectives.filter((o) => o.done).length;
  const nextDeadline = useMemo(() => {
    const sorted = objectives
      .filter((o) => !o.done && o.deadline !== null)
      .map((o) => o.deadline as string)
      .sort();
    return sorted[0] ?? null;
  }, [objectives]);

  const softBg =
    softColorBg(accent, theme.colors.background, 0.1) ??
    theme.colors.surfaceAlt;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tile: {
          flex: 1,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          backgroundColor: softBg,
          borderTopWidth: 3,
          borderTopColor: accent,
          minHeight: 96,
          justifyContent: 'space-between',
        },
        title: {
          fontSize: theme.font.xs,
          fontWeight: '700',
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        counter: {
          fontSize: 22,
          fontWeight: '800',
          color: theme.colors.text,
          marginTop: theme.spacing.xs,
        },
        deadlineRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          marginTop: theme.spacing.xs,
        },
        deadlineText: {
          fontSize: theme.font.xs,
          color: theme.colors.textMuted,
        },
      }),
    [theme, accent, softBg]
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.tile}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.counter}>
        {done}/{total}
      </Text>
      {nextDeadline ? (
        <View style={styles.deadlineRow}>
          <Feather name="calendar" size={10} color={theme.colors.textMuted} />
          <Text style={styles.deadlineText}>{nextDeadline.slice(5)}</Text>
        </View>
      ) : (
        <View style={styles.deadlineRow}>
          <Text style={styles.deadlineText}> </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
