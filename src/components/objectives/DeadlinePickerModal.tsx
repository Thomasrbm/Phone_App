import { Feather } from '@expo/vector-icons';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { toDayKey } from '@/lib/date';
import { useTheme } from '@/lib/themeContext';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type Props = {
  visible: boolean;
  // Initial date key 'YYYY-MM-DD' to preselect, or null if no current
  // deadline. Drives both the visible month and the highlighted cell.
  initialDeadline: string | null;
  accent: string;
  onClose: () => void;
  // null = clear the deadline. Caller is responsible for persisting.
  onConfirm: (deadline: string | null) => void;
};

// Modal calendar picker — one month at a time with < > nav. Tap a
// day = stage the selection (visual highlight). "Effacer" clears,
// "Valider" emits the staged value.
export default function DeadlinePickerModal({
  visible,
  initialDeadline,
  accent,
  onClose,
  onConfirm,
}: Props) {
  const { theme } = useTheme();

  // Reset internal state when the modal opens with new inputs. Using
  // initialDeadline + visible as the seed; React resets via key trick:
  // we use a ref counter — simpler is to use defaults and let parent
  // remount with key={openCount} if needed. Here we accept that on
  // first open the picker shows initialDeadline, subsequent opens with
  // a different objective will get a new mount via parent's conditional
  // render of <Modal />.
  const initialDate = useMemo(
    () => (initialDeadline ? parseISO(initialDeadline) : new Date()),
    [initialDeadline]
  );
  const [visibleMonth, setVisibleMonth] = useState<Date>(initialDate);
  const [pending, setPending] = useState<string | null>(initialDeadline);

  const gridStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const rows: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }

  const monthLabel = format(visibleMonth, 'MMMM yyyy', { locale: fr });
  const monthLabelCapped =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const pendingDate = pending ? parseISO(pending) : null;
  const pendingLabel = pendingDate
    ? format(pendingDate, 'EEEE d MMMM yyyy', { locale: fr })
    : 'Aucune deadline';
  const pendingLabelCapped =
    pendingLabel.charAt(0).toUpperCase() + pendingLabel.slice(1);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.lg,
        },
        sheet: {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
        },
        navRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.md,
        },
        navBtn: {
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        },
        monthLabel: {
          fontSize: theme.font.lg,
          fontWeight: '700',
          color: theme.colors.text,
        },
        weekdaysRow: {
          flexDirection: 'row',
          marginBottom: 4,
        },
        weekdayCell: {
          flex: 1,
          textAlign: 'center',
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
          fontWeight: '700',
        },
        gridRow: {
          flexDirection: 'row',
        },
        cell: {
          flex: 1,
          aspectRatio: 1,
          padding: 2,
        },
        cellInner: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.md,
          backgroundColor: 'transparent',
        },
        cellOutOfMonth: {
          opacity: 0.3,
        },
        cellToday: {
          borderWidth: 1.5,
          borderColor: theme.colors.today,
        },
        cellSelected: {
          backgroundColor: accent,
        },
        cellText: {
          fontSize: theme.font.md,
          color: theme.colors.text,
        },
        cellTextSelected: {
          color: theme.colors.textInverse,
          fontWeight: '700',
        },
        selectedLabel: {
          marginTop: theme.spacing.md,
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          textAlign: 'center',
        },
        actionsRow: {
          marginTop: theme.spacing.lg,
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: theme.spacing.sm,
        },
        actionBtn: {
          flex: 1,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceAlt,
        },
        actionBtnPrimary: {
          backgroundColor: accent,
        },
        actionText: {
          fontSize: theme.font.md,
          fontWeight: '600',
          color: theme.colors.textMuted,
        },
        actionTextPrimary: {
          color: theme.colors.textInverse,
        },
        clearBtn: {
          paddingVertical: theme.spacing.sm,
          alignItems: 'center',
          marginTop: theme.spacing.sm,
        },
        clearText: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          textDecorationLine: 'underline',
        },
      }),
    [theme, accent]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.backdrop}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.sheet}>
            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={() => setVisibleMonth((m) => addMonths(m, -1))}
                style={styles.navBtn}
                hitSlop={8}
              >
                <Feather
                  name="chevron-left"
                  size={22}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{monthLabelCapped}</Text>
              <TouchableOpacity
                onPress={() => setVisibleMonth((m) => addMonths(m, 1))}
                style={styles.navBtn}
                hitSlop={8}
              >
                <Feather
                  name="chevron-right"
                  size={22}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((d, i) => (
                <Text key={i} style={styles.weekdayCell}>
                  {d}
                </Text>
              ))}
            </View>

            {rows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.gridRow}>
                {row.map((d) => {
                  const key = toDayKey(d);
                  const inMonth = isSameMonth(d, visibleMonth);
                  const isSel = pendingDate
                    ? isSameDay(d, pendingDate)
                    : false;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={styles.cell}
                      onPress={() => setPending(key)}
                      activeOpacity={0.6}
                    >
                      <View
                        style={[
                          styles.cellInner,
                          !inMonth && styles.cellOutOfMonth,
                          isToday(d) && !isSel && styles.cellToday,
                          isSel && styles.cellSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.cellText,
                            isSel && styles.cellTextSelected,
                          ]}
                        >
                          {d.getDate()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <Text style={styles.selectedLabel}>{pendingLabelCapped}</Text>

            {pending ? (
              <TouchableOpacity
                onPress={() => setPending(null)}
                style={styles.clearBtn}
                hitSlop={8}
              >
                <Text style={styles.clearText}>Effacer la deadline</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.actionBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.actionText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onConfirm(pending)}
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionText, styles.actionTextPrimary]}>
                  Valider
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
