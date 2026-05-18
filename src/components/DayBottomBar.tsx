import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import DragHandle from '@/components/DragHandle';
import { useTheme } from '@/lib/themeContext';

type Props = {
  onPrevDay: () => void;
  onNextDay: () => void;
  onOpenCalendar: () => void;
};

// Bottom navigation row of the day screen: < chevron — drag-up to
// calendar — > chevron. The DragHandle is centred and the chevrons are
// equally spaced on either side.
export default function DayBottomBar({
  onPrevDay,
  onNextDay,
  onOpenCalendar,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        bar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
        },
        nav: {
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [theme]
  );

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        onPress={onPrevDay}
        style={styles.nav}
        hitSlop={12}
        activeOpacity={0.55}
      >
        <Feather
          name="chevron-left"
          size={22}
          color={theme.colors.textMuted}
        />
      </TouchableOpacity>
      <DragHandle direction="up" onTrigger={onOpenCalendar} label="Calendrier" />
      <TouchableOpacity
        onPress={onNextDay}
        style={styles.nav}
        hitSlop={12}
        activeOpacity={0.55}
      >
        <Feather
          name="chevron-right"
          size={22}
          color={theme.colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}
