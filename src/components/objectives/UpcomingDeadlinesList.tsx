import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Objective, ObjectiveHorizon } from '@/db/objectives';
import { todayKey } from '@/lib/date';
import { useTheme } from '@/lib/themeContext';

type Props = {
  // All non-done objectives, all horizons. Sorted + sliced internally.
  objectives: Objective[];
  // Max rows. Past the limit, a "Voir tout" CTA could be added later.
  limit?: number;
  onOpenObjective: (id: string) => void;
};

// Compact list of the next few deadlines across all horizons. Sorts
// by date (overdue at top, then today, then upcoming). The point is
// to surface "what's coming" without making the user open each
// horizon page.
//
// Each row: small horizon dot, title, smart deadline label
// (Aujourd'hui / Demain / Dans X j. / En retard / explicit date for
// far-out dates). Tap = open the objective.
export default function UpcomingDeadlinesList({
  objectives,
  limit = 5,
  onOpenObjective,
}: Props) {
  const { theme } = useTheme();
  const today = todayKey();

  const rows = useMemo(() => {
    return objectives
      .filter((o) => !o.done && o.deadline !== null)
      .sort((a, b) =>
        (a.deadline as string).localeCompare(b.deadline as string)
      )
      .slice(0, limit);
  }, [objectives, limit]);

  const horizonColor = (h: ObjectiveHorizon): string => {
    if (h === 'long') return theme.colors.objectiveLong;
    if (h === 'medium') return theme.colors.objectiveMedium;
    return theme.colors.objectiveShort;
  };

  const formatDeadline = (
    deadline: string
  ): { label: string; overdue: boolean } => {
    if (deadline === today) return { label: "Aujourd'hui", overdue: false };
    const d = parseISO(deadline);
    const t = parseISO(today);
    const diffDays = Math.round((d.getTime() - t.getTime()) / 86400000);
    if (diffDays < 0) {
      return {
        label: `En retard de ${Math.abs(diffDays)} j.`,
        overdue: true,
      };
    }
    if (diffDays === 1) return { label: 'Demain', overdue: false };
    if (diffDays <= 7) return { label: `Dans ${diffDays} j.`, overdue: false };
    const sameYear = d.getFullYear() === t.getFullYear();
    const fmt = sameYear ? 'd MMM' : 'd MMM yyyy';
    return { label: format(d, fmt, { locale: fr }), overdue: false };
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceAlt,
          paddingVertical: theme.spacing.sm,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.sm,
          gap: theme.spacing.sm,
        },
        title: {
          fontSize: theme.font.xs,
          fontWeight: '700',
          color: theme.colors.textSubtle,
          textTransform: 'uppercase',
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
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          gap: theme.spacing.sm,
        },
        dot: {
          width: 8,
          height: 8,
          borderRadius: 4,
        },
        title2: {
          flex: 1,
          fontSize: theme.font.md,
          color: theme.colors.text,
          fontWeight: '500',
        },
        deadline: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          fontWeight: '600',
        },
        deadlineOverdue: {
          color: theme.colors.objectiveLong,
        },
      }),
    [theme]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Feather name="zap" size={14} color={theme.colors.textSubtle} />
        <Text style={styles.title}>Prochaines deadlines</Text>
      </View>
      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Aucune deadline à venir. Crée un objectif pour démarrer.
          </Text>
        </View>
      ) : (
        rows.map((o) => {
          const info = formatDeadline(o.deadline as string);
          return (
            <TouchableOpacity
              key={o.id}
              onPress={() => onOpenObjective(o.id)}
              activeOpacity={0.7}
              style={styles.row}
            >
              <View
                style={[styles.dot, { backgroundColor: horizonColor(o.horizon) }]}
              />
              <Text style={styles.title2} numberOfLines={1}>
                {o.title}
              </Text>
              <Text
                style={[styles.deadline, info.overdue && styles.deadlineOverdue]}
              >
                {info.label}
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}
