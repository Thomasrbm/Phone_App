import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ObjectivesYearView from '@/components/objectives/ObjectivesYearView';
import type { ObjectiveHorizon } from '@/db/objectives';
import { useTheme } from '@/lib/themeContext';

type Props = {
  visible: boolean;
  // Year to open the browser on. Use the current year by default at
  // call site — the modal will land on it.
  initialYear: number;
  // Same shape the inline year view expects: dayKey → horizon.
  deadlinesByDay: Map<string, ObjectiveHorizon>;
  // Per-year deadline counts (all horizons) for the picker meta.
  deadlineCountByYear: Map<number, number>;
  onClose: () => void;
  // User tapped a deadline cell — caller closes the modal AND opens
  // the corresponding objective.
  onSelectDay: (dayKey: string) => void;
};

const PICKER_PAST = 30;
const PICKER_FUTURE = 70;
const ROW_HEIGHT = 52;

// Full-screen browser for year-level navigation. Two modes:
//
//   detail (default) — header with < year > nav + "📅 Choisir" CTA,
//                       12-month grid below
//   picker           — scrollable year list, tap to select
//
// Pure full-screen because the 12-month grid needs vertical room.
// Closing the modal (X or back gesture) drops the whole subtree —
// no leftover "year view" in the host page.
export default function ObjectivesYearBrowserModal({
  visible,
  initialYear,
  deadlinesByDay,
  deadlineCountByYear,
  onClose,
  onSelectDay,
}: Props) {
  const { theme } = useTheme();
  const [year, setYear] = useState(initialYear);
  const [mode, setMode] = useState<'detail' | 'picker'>('detail');

  // Re-sync state with the initialYear prop each time the modal
  // re-opens. Without this, a previous browse session would leak.
  useEffect(() => {
    if (visible) {
      setYear(initialYear);
      setMode('detail');
    }
  }, [visible, initialYear]);

  const handlePickYear = (y: number) => {
    setYear(y);
    setMode('detail');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        edges={['top', 'bottom']}
      >
        {/* Conditionally render the inner subtree so the FlatList
            inside the picker remounts each open — that's what makes
            initialScrollIndex actually take effect. */}
        {visible ? (
          mode === 'detail' ? (
            <DetailInner
              year={year}
              deadlinesByDay={deadlinesByDay}
              onClose={onClose}
              onPrev={() => setYear((y) => y - 1)}
              onNext={() => setYear((y) => y + 1)}
              onOpenPicker={() => setMode('picker')}
              onSelectDay={(d) => {
                onSelectDay(d);
                onClose();
              }}
            />
          ) : (
            <PickerInner
              selectedYear={year}
              deadlineCountByYear={deadlineCountByYear}
              onClose={onClose}
              onBackToDetail={() => setMode('detail')}
              onPick={handlePickYear}
            />
          )
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

// --- Detail mode ---

function DetailInner({
  year,
  deadlinesByDay,
  onClose,
  onPrev,
  onNext,
  onOpenPicker,
  onSelectDay,
}: {
  year: number;
  deadlinesByDay: Map<string, ObjectiveHorizon>;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenPicker: () => void;
  onSelectDay: (dayKey: string) => void;
}) {
  const { theme } = useTheme();
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          gap: theme.spacing.sm,
        },
        closeBtn: {
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        },
        navBtn: {
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        },
        yearTitle: {
          flex: 1,
          fontSize: theme.font.xl,
          fontWeight: '800',
          color: theme.colors.text,
          textAlign: 'center',
        },
        yearTitleCurrent: {
          color: theme.colors.objectiveLong,
        },
        pickerCta: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surfaceAlt,
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          alignSelf: 'center',
        },
        pickerCtaText: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          fontWeight: '600',
        },
      }),
    [theme]
  );

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPrev} style={styles.navBtn} hitSlop={8}>
          <Feather name="chevron-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          style={[
            styles.yearTitle,
            year === currentYear && styles.yearTitleCurrent,
          ]}
        >
          {year}
        </Text>
        <TouchableOpacity onPress={onNext} style={styles.navBtn} hitSlop={8}>
          <Feather name="chevron-right" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.closeBtn} />
      </View>
      <TouchableOpacity
        onPress={onOpenPicker}
        style={styles.pickerCta}
        activeOpacity={0.7}
      >
        <Feather name="list" size={14} color={theme.colors.textMuted} />
        <Text style={styles.pickerCtaText}>Choisir une autre année</Text>
      </TouchableOpacity>
      <ObjectivesYearView
        year={year}
        deadlinesByDay={deadlinesByDay}
        onSelectDay={onSelectDay}
      />
    </>
  );
}

// --- Picker mode ---

function PickerInner({
  selectedYear,
  deadlineCountByYear,
  onClose,
  onBackToDetail,
  onPick,
}: {
  selectedYear: number;
  deadlineCountByYear: Map<number, number>;
  onClose: () => void;
  onBackToDetail: () => void;
  onPick: (year: number) => void;
}) {
  const { theme } = useTheme();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const listRef = useRef<FlatList<number>>(null);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = currentYear - PICKER_PAST; y <= currentYear + PICKER_FUTURE; y++) {
      out.push(y);
    }
    return out;
  }, [currentYear]);

  const initialIndex = useMemo(() => {
    const idx = years.indexOf(selectedYear);
    return idx >= 0 ? idx : years.indexOf(currentYear);
  }, [years, selectedYear, currentYear]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          gap: theme.spacing.sm,
        },
        backBtn: {
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        },
        title: {
          flex: 1,
          fontSize: theme.font.lg,
          fontWeight: '700',
          color: theme.colors.text,
          textAlign: 'center',
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          height: ROW_HEIGHT,
          borderRadius: theme.radius.md,
          marginHorizontal: theme.spacing.sm,
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
          fontWeight: '700',
          color: theme.colors.objectiveLong,
        },
      }),
    [theme]
  );

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBackToDetail} style={styles.backBtn} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Choisir une année</Text>
        <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={8}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      <FlatList
        ref={listRef}
        data={years}
        keyExtractor={(y) => String(y)}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
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
                <Text style={styles.meta}>
                  {count} deadline{count > 1 ? 's' : ''}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </>
  );
}
