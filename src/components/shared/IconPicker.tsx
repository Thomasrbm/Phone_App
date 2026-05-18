import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/lib/themeContext';
import { ICON_SECTIONS, type FeatherName } from '@/lib/icons';

type Props = {
  value: FeatherName | null;
  onChange: (next: FeatherName | null) => void;
  color?: string;
};

export default function IconPicker({ value, onChange, color }: Props) {
  const { theme } = useTheme();
  const tint = color ?? theme.colors.text;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {},
        section: {
          marginBottom: theme.spacing.lg,
        },
        sectionLabel: {
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: theme.spacing.sm,
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
        },
        chip: {
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        },
        chipSelected: {
          borderWidth: 2,
          borderColor: tint,
          backgroundColor: theme.colors.surface,
        },
        chipNoneSelected: {
          borderWidth: 2,
          borderColor: theme.colors.text,
        },
      }),
    [theme, tint]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Aucune</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            onPress={() => onChange(null)}
            style={[styles.chip, value === null && styles.chipNoneSelected]}
          >
            <Feather name="x" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
      {ICON_SECTIONS.map((section) => (
        <View key={section.label} style={styles.section}>
          <Text style={styles.sectionLabel}>{section.label}</Text>
          <View style={styles.grid}>
            {section.icons.map((name) => {
              const selected = value === name;
              return (
                <TouchableOpacity
                  key={name}
                  onPress={() => onChange(name)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Feather
                    name={name}
                    size={18}
                    color={selected ? tint : theme.colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
