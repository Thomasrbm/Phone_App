import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/lib/themeContext';

type Props = {
  onPress: () => void;
};

// Sibling of CalendarButton / TodayButton — same 40x44 shape, green band,
// drops the user into the routines tracker.
export default function RoutineTrackerButton({ onPress }: Props) {
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
          backgroundColor: theme.colors.routine,
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
        <Feather name="repeat" size={18} color={theme.colors.routine} />
      </View>
    </TouchableOpacity>
  );
}
