import { useEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/lib/themeContext';

type Props = {
  visible: boolean;
  selectedYear: number | null;
  // year → number of deadlines that year (any horizon, non-done).
  // Used as a meta hint next to each row.
  deadlineCountByYear: Map<number, number>;
  onClose: () => void;
  onPick: (year: number) => void;
};

// Range hard-coded around "now". 100 years total is enough for any
// realistic personal-goal horizon and keeps the list short enough to
// scroll fluidly.
const RANGE_PAST = 30;
const RANGE_FUTURE = 70;

// Scrollable year picker. Auto-scrolls to the currently selected
// year (or the current year as a fallback) when the modal opens.
export default function ObjectivesYearPickerModal({
  visible,
  selectedYear,
  deadlineCountByYear,
  onClose,
  onPick,
}: Props) {
  const { theme } = useTheme();
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = currentYear - RANGE_PAST; y <= currentYear + RANGE_FUTURE; y++) {
      out.push(y);
    }
    return out;
  }, [currentYear]);

  const listRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    if (!visible) return;
    const target = selectedYear ?? currentYear;
    const idx = years.indexOf(target);
    if (idx < 0) return;
    // Defer to next tick so the FlatList has measured its layout.
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: idx,
        animated: false,
        viewPosition: 0.5,
      });
    }, 0);
    return () => clearTimeout(t);
  }, [visible, selectedYear, currentYear, years]);

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
          padding: theme.spacing.md,
          maxHeight: '70%',
        },
        title: {
          fontSize: theme.font.lg,
          fontWeight: '700',
          color: theme.colors.text,
          marginBottom: theme.spacing.md,
          textAlign: 'center',
        },
        listWrap: {
          flexGrow: 0,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.md,
        },
        rowSelected: {
          backgroundColor: theme.colors.surfaceAlt,
        },
        rowCurrent: {
          borderLeftWidth: 3,
          borderLeftColor: theme.colors.objectiveLong,
        },
        yearText: {
          fontSize: theme.font.lg,
          color: theme.colors.text,
          fontWeight: '600',
        },
        yearTextMuted: {
          color: theme.colors.textMuted,
        },
        meta: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
        },
        metaActive: {
          color: theme.colors.objectiveLong,
          fontWeight: '700',
        },
        cancelBtn: {
          marginTop: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          alignItems: 'center',
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surfaceAlt,
        },
        cancelText: {
          fontSize: theme.font.md,
          fontWeight: '600',
          color: theme.colors.textMuted,
        },
      }),
    [theme]
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
            <Text style={styles.title}>Choisir une année</Text>
            <FlatList
              ref={listRef}
              style={styles.listWrap}
              data={years}
              keyExtractor={(y) => String(y)}
              getItemLayout={(_, index) => ({
                length: 52,
                offset: 52 * index,
                index,
              })}
              renderItem={({ item: y }) => {
                const count = deadlineCountByYear.get(y) ?? 0;
                const isSelected = selectedYear === y;
                const isCurrent = y === currentYear;
                return (
                  <TouchableOpacity
                    onPress={() => onPick(y)}
                    activeOpacity={0.7}
                    style={[
                      styles.row,
                      isSelected && styles.rowSelected,
                      isCurrent && styles.rowCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.yearText,
                        count === 0 && !isCurrent && styles.yearTextMuted,
                      ]}
                    >
                      {y}
                      {isCurrent ? '  · aujourd’hui' : ''}
                    </Text>
                    {count > 0 ? (
                      <Text style={[styles.meta, styles.metaActive]}>
                        {count} deadline{count > 1 ? 's' : ''}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
