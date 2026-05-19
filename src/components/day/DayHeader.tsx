import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/lib/themeContext';

type Props = {
  date: string;
  // In selectMode, the action row is replaced with a Cancel + "N
  // sélectionnée" header. The bulk actions live at the bottom of the
  // screen (delete bar), not here.
  selectMode: boolean;
  selectedCount: number;
  searchOpen: boolean;
  deletedCount: number;
  // Number of urgent objective deadlines (overdue + due in next 7
  // days, not done). Shown as a badge on the objectives flag — same
  // pattern as the trash badge. Hidden when zero.
  urgentObjectivesCount: number;
  onCancelSelect: () => void;
  onToggleSearch: () => void;
  onOpenObjectives: () => void;
  onOpenTrash: () => void;
  onOpenSettings: () => void;
};

// Top of the day screen: either the standard action row (search /
// objectives / trash / settings + date title), or the multi-select
// header (cancel + selection count). Pure presentational — DayContent
// owns the state and toggle handlers.
export default function DayHeader({
  date,
  selectMode,
  selectedCount,
  searchOpen,
  deletedCount,
  urgentObjectivesCount,
  onCancelSelect,
  onToggleSearch,
  onOpenObjectives,
  onOpenTrash,
  onOpenSettings,
}: Props) {
  const { theme } = useTheme();

  const titleCapped = useMemo(() => {
    const t = format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }, [date]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        },
        leftActions: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
        },
        rightActions: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
        },
        centerSlot: {
          flex: 1,
          alignItems: 'center',
        },
        iconBtn: {
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        },
        badge: {
          position: 'absolute',
          top: 4,
          right: 2,
          backgroundColor: theme.colors.today,
          minWidth: 14,
          height: 14,
          borderRadius: 7,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 3,
        },
        badgeText: {
          color: theme.colors.textInverse,
          fontSize: 9,
          fontWeight: '700',
        },
        cancelBtn: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        },
        cancelLink: {
          color: theme.colors.accent,
          fontSize: theme.font.md,
          fontWeight: '500',
        },
        selectionTitle: {
          fontSize: theme.font.lg,
          fontWeight: '700',
          color: theme.colors.text,
        },
        dateTitle: {
          fontSize: theme.font.xl,
          fontWeight: '700',
          color: theme.colors.text,
          textAlign: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.sm,
        },
      }),
    [theme]
  );

  if (selectMode) {
    return (
      <View style={styles.row}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            onPress={onCancelSelect}
            hitSlop={8}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelLink}>Annuler</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerSlot}>
          <Text style={styles.selectionTitle}>
            {selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.rightActions} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.row}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            onPress={onToggleSearch}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Feather
              name="search"
              size={22}
              color={searchOpen ? theme.colors.accent : theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOpenObjectives}
            style={styles.iconBtn}
            hitSlop={8}
          >
            {/* `flag` reads universally as "goal / objectif" — the
                previous `target` was confused with crosshair / aim.
                Always rendered in objectiveLong red because this
                button is the primary signal for the Objectifs
                section. The badge mirrors the trash badge pattern:
                small red pill with the count of urgent deadlines
                (overdue + due within 7 days). */}
            <Feather
              name="flag"
              size={22}
              color={theme.colors.objectiveLong}
            />
            {urgentObjectivesCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{urgentObjectivesCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
        <View style={styles.centerSlot} />
        <View style={styles.rightActions}>
          <TouchableOpacity
            onPress={onOpenTrash}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Feather name="trash-2" size={22} color={theme.colors.text} />
            {deletedCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{deletedCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOpenSettings}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Feather name="settings" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.dateTitle}>{titleCapped}</Text>
    </>
  );
}
