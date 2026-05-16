import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type ThemeMode } from '@/lib/themeContext';

const APPEARANCE: { key: ThemeMode; label: string; hint: string }[] = [
  { key: 'system', label: 'Système', hint: 'Suit le réglage du téléphone' },
  { key: 'light', label: 'Clair', hint: '' },
  { key: 'dark', label: 'Sombre', hint: '' },
];

export default function SettingsIndexScreen() {
  const { theme, mode, setMode } = useTheme();
  const router = useRouter();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scroll: {
          paddingBottom: theme.spacing.xl,
        },
        sectionLabel: {
          fontSize: theme.font.xs,
          color: theme.colors.textSubtle,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.xl,
          paddingBottom: theme.spacing.sm,
        },
        group: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.borderSubtle,
        },
        rowLast: {
          borderBottomWidth: 0,
        },
        rowText: {
          flex: 1,
          paddingRight: theme.spacing.md,
        },
        rowLabel: {
          fontSize: theme.font.lg,
          color: theme.colors.text,
          fontWeight: '500',
        },
        rowHint: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          marginTop: 2,
        },
      }),
    [theme]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Paramètres',
          headerBackTitle: 'Retour',
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Apparence</Text>
        <View style={styles.group}>
          {APPEARANCE.map((opt, idx) => {
            const selected = opt.key === mode;
            const isLast = idx === APPEARANCE.length - 1;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setMode(opt.key)}
                style={[styles.row, isLast && styles.rowLast]}
                activeOpacity={0.6}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{opt.label}</Text>
                  {opt.hint ? (
                    <Text style={styles.rowHint}>{opt.hint}</Text>
                  ) : null}
                </View>
                {selected ? (
                  <Feather
                    name="check"
                    size={20}
                    color={theme.colors.accent}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Personnalisation</Text>
        <View style={styles.group}>
          <TouchableOpacity
            onPress={() => router.push('/settings/mantras')}
            style={[styles.row, styles.rowLast]}
            activeOpacity={0.6}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Mantras du jour</Text>
              <Text style={styles.rowHint}>
                Gère les citations affichées sur la page du jour.
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
