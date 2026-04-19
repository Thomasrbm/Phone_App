import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '@/lib/theme';

type Props = {
  onPress: () => void;
};

export default function AddTaskInput({ onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.bar}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>Ajouter une nouvelle tâche</Text>
      <View style={styles.btn}>
        <Feather name="plus" size={18} color={theme.colors.textInverse} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
  },
  text: {
    flex: 1,
    fontSize: theme.font.md,
    color: theme.colors.textMuted,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
