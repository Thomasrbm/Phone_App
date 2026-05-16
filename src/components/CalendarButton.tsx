import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/lib/themeContext';

type Props = {
  onPress: () => void;
};

// Symmetric counterpart to TodayButton — same 40x44 shape so the two
// screens read as siblings. Tapping it opens the calendar view.
export default function CalendarButton({ onPress }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        btn: {
          width: 40,
          height: 44,
          borderRadius: 6,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          overflow: 'hidden',
          backgroundColor: theme.colors.surface,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 2,
          elevation: 1,
        },
        topBar: {
          height: 8,
          backgroundColor: theme.colors.accent,
        },
        body: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [theme]
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.btn}>
      <View style={styles.topBar} />
      <View style={styles.body}>
        <Feather name="calendar" size={18} color={theme.colors.accent} />
      </View>
    </TouchableOpacity>
  );
}
