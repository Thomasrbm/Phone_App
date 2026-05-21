import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/themeContext';

type Props = {
  onPress: () => void;
};

// Floating action button anchored bottom-right of the objectives
// overview. Quick add from anywhere in the screen — the horizon is
// chosen inside the modal. Same affordance as the trash bar / fab
// patterns elsewhere in the app.
export default function ObjectivesFab({ onPress }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        fab: {
          position: 'absolute',
          right: theme.spacing.lg,
          bottom: theme.spacing.lg + 8,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.colors.objectiveLong,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 5,
          elevation: 6,
          zIndex: 10,
        },
      }),
    [theme]
  );
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.fab}
      activeOpacity={0.85}
      hitSlop={8}
    >
      <Feather name="plus" size={28} color={theme.colors.textInverse} />
    </TouchableOpacity>
  );
}
