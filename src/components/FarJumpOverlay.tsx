import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  SlideInLeft,
  SlideInRight,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/themeContext';

type Props = {
  farJump: { toDate: string; direction: 'right' | 'left' };
};

// Lightweight overlay panel that slides in from the side to mask the
// pager re-anchor + DayContent mount for far jumps. Renders the target
// date as title only (no SQL, no list), so it's free.
export default function FarJumpOverlay({ farJump }: Props) {
  const { theme } = useTheme();
  const title = useMemo(() => {
    const t = format(parseISO(farJump.toDate), 'EEEE d MMMM yyyy', {
      locale: fr,
    });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }, [farJump.toDate]);
  const Enter = farJump.direction === 'right' ? SlideInRight : SlideInLeft;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor: theme.colors.background },
      ]}
      entering={Enter.duration(220).easing(Easing.out(Easing.cubic))}
      exiting={FadeOut.duration(90)}
    >
      <SafeAreaView style={styles.inner} edges={['top']}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 50,
  },
  inner: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: 16,
    paddingHorizontal: 24,
  },
});
