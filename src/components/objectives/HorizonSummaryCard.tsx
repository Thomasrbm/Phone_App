import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
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

// Read-only summary tile for one horizon, shown on the /objectives
// overview. Tapping it pushes to the dedicated horizon screen.
// Shows: title, done/total counter, the next upcoming deadline (if
// any), the first 2 objective titles as a teaser.
export default function HorizonSummaryCard({
  title,
  accent,
  objectives,
  onPress,
}: Props) {
  const { theme } = useTheme();

  const total = objectives.length;
  const done = objectives.filter((o) => o.done).length;

  // Next upcoming deadline among non-done objectives.
  const nextDeadline = useMemo(() => {
    const futureOrToday = objectives
      .filter((o) => !o.done && o.deadline !== null)
      .map((o) => o.deadline as string)
      .sort();
    return futureOrToday[0] ?? null;
  }, [objectives]);

  const teaser = objectives
    .filter((o) => !o.done)
    .slice(0, 2)
    .map((o) => o.title);

  const softBg =
    softColorBg(accent, theme.colors.background, 0.12) ??
    theme.colors.surfaceAlt;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.md,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: softBg,
          borderLeftWidth: 4,
          borderLeftColor: accent,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.xs,
        },
        title: {
          fontSize: theme.font.lg,
          fontWeight: '700',
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        chevron: {
          opacity: 0.7,
        },
        meta: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          marginBottom: theme.spacing.sm,
        },
        teaserRow: {
          fontSize: theme.font.sm,
          color: theme.colors.text,
          marginTop: 2,
        },
        teaserMuted: {
          color: theme.colors.textMuted,
          fontStyle: 'italic',
        },
      }),
    [theme, accent, softBg]
  );

  const metaParts: string[] = [];
  metaParts.push(total === 0 ? 'Aucun objectif' : `${done}/${total}`);
  if (nextDeadline) {
    const d = parseISO(nextDeadline);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    const fmt = sameYear ? 'd MMM' : 'd MMM yyyy';
    metaParts.push(`prochain : ${format(d, fmt, { locale: fr })}`);
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Feather
          name="chevron-right"
          size={20}
          color={accent}
          style={styles.chevron}
        />
      </View>
      <Text style={styles.meta}>{metaParts.join(' · ')}</Text>
      {teaser.length === 0 ? (
        <Text style={[styles.teaserRow, styles.teaserMuted]}>
          {total === 0 ? 'Appuie pour en ajouter.' : 'Tout est coché.'}
        </Text>
      ) : (
        teaser.map((t, i) => (
          <Text key={i} style={styles.teaserRow} numberOfLines={1}>
            • {t}
          </Text>
        ))
      )}
    </TouchableOpacity>
  );
}
