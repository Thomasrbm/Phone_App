import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '@/lib/theme';

type Props = {
  day: number;
  onPress: () => void;
};

export default function TodayButton({ day, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.btn}>
      <View style={styles.topBar} />
      <View style={styles.body}>
        <Text style={styles.dayText}>{day}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: theme.colors.today,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    color: theme.colors.today,
    fontSize: theme.font.lg,
    fontWeight: '800',
  },
});
