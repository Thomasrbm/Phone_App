import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/lib/themeContext';

export type CalendarView = 'month' | 'week';

type Props = {
  visible: boolean;
  current: CalendarView;
  onSelect: (v: CalendarView) => void;
  onClose: () => void;
  onOpenSettings?: () => void;
};

const OPTIONS: { key: CalendarView; label: string }[] = [
  { key: 'month', label: 'Mois' },
  { key: 'week', label: 'Semaine' },
];

export default function ViewMenu({
  visible,
  current,
  onSelect,
  onClose,
  onOpenSettings,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
        },
        menu: {
          position: 'absolute',
          top: 60,
          left: theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          paddingVertical: theme.spacing.xs,
          minWidth: 200,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
        item: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        },
        itemSelected: {
          backgroundColor: theme.colors.surfaceAlt,
        },
        label: {
          fontSize: theme.font.lg,
          color: theme.colors.text,
        },
        labelSelected: {
          fontWeight: '600',
          color: theme.colors.today,
        },
        check: {
          fontSize: theme.font.md,
          color: theme.colors.today,
          fontWeight: '700',
        },
        separator: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.border,
          marginVertical: theme.spacing.xs,
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
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.menu}>
          {OPTIONS.map((opt) => {
            const selected = opt.key === current;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => {
                  onSelect(opt.key);
                  onClose();
                }}
                style={[styles.item, selected && styles.itemSelected]}
              >
                <Text style={[styles.label, selected && styles.labelSelected]}>
                  {opt.label}
                </Text>
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
          {onOpenSettings ? (
            <>
              <View style={styles.separator} />
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onOpenSettings();
                }}
                style={styles.item}
              >
                <Text style={styles.label}>Paramètres</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );
}
