import { useMemo, type ReactNode } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/lib/themeContext';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  // 'raised' — white surface + soft shadow (default), for primary content.
  // 'flat'   — muted surfaceAlt + hairline border, no shadow, for nested
  //            or secondary blocks where a shadow would be too heavy.
  variant?: 'raised' | 'flat';
};

// Shared surface primitive for the redesign. Owns the card's radius,
// internal padding and (for `raised`) elevation, so screens stop
// re-deriving these per component. Outer margins are intentionally left
// to the caller (via `style`) — the parent knows the screen insets.
export default function Card({
  children,
  style,
  onPress,
  variant = 'raised',
}: Props) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        },
        raised: {
          backgroundColor: theme.colors.surface,
          ...theme.elevation.sm,
        },
        flat: {
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.borderSubtle,
        },
      }),
    [theme]
  );

  const cardStyle = [
    styles.base,
    variant === 'raised' ? styles.raised : styles.flat,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}
