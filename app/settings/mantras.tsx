import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getMantras,
  getMantrasEnabled,
  setMantras,
  setMantrasEnabled,
} from '@/lib/mantras';
import { useTheme } from '@/lib/themeContext';

export default function MantrasSettingsScreen() {
  const { theme } = useTheme();
  const [mantras, setMantrasState] = useState<string[]>([]);
  const [isCustom, setIsCustom] = useState(false);
  const [mantrasEnabled, setMantrasEnabledState] = useState(true);
  const [newMantra, setNewMantra] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMantras(), getMantrasEnabled()]).then(
      ([state, enabled]) => {
        if (cancelled) return;
        setMantrasState(state.list);
        setIsCustom(state.isCustom);
        setMantrasEnabledState(enabled);
        setLoaded(true);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const persistList = (next: string[]) => {
    setMantrasState(next);
    setIsCustom(next.length > 0);
    setMantras(next);
  };

  const toggleEnabled = (v: boolean) => {
    setMantrasEnabledState(v);
    setMantrasEnabled(v);
  };

  const addMantra = () => {
    const trimmed = newMantra.trim();
    if (!trimmed) return;
    const base = isCustom ? mantras : [];
    persistList([...base, trimmed]);
    setNewMantra('');
    Keyboard.dismiss();
  };

  const removeMantra = (idx: number) => {
    persistList(mantras.filter((_, i) => i !== idx));
  };

  const updateMantra = (idx: number, value: string) => {
    setMantrasState((prev) => prev.map((m, i) => (i === idx ? value : m)));
  };

  const commitMantra = (idx: number) => {
    const trimmed = mantras[idx]?.trim() ?? '';
    if (!trimmed) {
      removeMantra(idx);
      return;
    }
    persistList(mantras.map((m, i) => (i === idx ? trimmed : m)));
  };

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
        mantraRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          minHeight: 56,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.borderSubtle,
        },
        rowLast: {
          borderBottomWidth: 0,
        },
        mantraInput: {
          flex: 1,
          fontSize: theme.font.md,
          color: theme.colors.text,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.sm,
          textAlign: 'center',
        },
        mantraDeleteBtn: {
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        },
        defaultBadge: {
          flex: 1,
          fontSize: theme.font.md,
          color: theme.colors.textMuted,
          fontStyle: 'italic',
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.sm,
          textAlign: 'center',
        },
        addRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
        },
        addInput: {
          flex: 1,
          fontSize: theme.font.md,
          color: theme.colors.text,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
        addBtn: {
          width: 44,
          height: 44,
          marginLeft: theme.spacing.sm,
          borderRadius: 22,
          backgroundColor: theme.colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        addBtnDisabled: {
          opacity: 0.3,
        },
        dimmed: {
          opacity: 0.4,
        },
      }),
    [theme]
  );

  const editingDisabled = !mantrasEnabled;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Mantras',
          headerBackTitle: 'Retour',
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>Affichage</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Afficher un mantra</Text>
              <Text style={styles.rowHint}>
                {isCustom
                  ? 'Tirés de ta liste ci-dessous.'
                  : 'Tirés des suggestions par défaut tant que ta liste est vide.'}
              </Text>
            </View>
            <Switch
              value={mantrasEnabled}
              onValueChange={toggleEnabled}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.accent,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, editingDisabled && styles.dimmed]}>
          {isCustom ? 'Tes mantras' : 'Mantras par défaut'}
        </Text>
        <View style={[styles.group, editingDisabled && styles.dimmed]}>
          {loaded
            ? mantras.map((m, idx) => (
                <View
                  key={`${idx}-${isCustom ? 'c' : 'd'}`}
                  style={[
                    styles.mantraRow,
                    idx === mantras.length - 1 && styles.rowLast,
                  ]}
                >
                  {isCustom ? (
                    <>
                      <TextInput
                        value={m}
                        onChangeText={(v) => updateMantra(idx, v)}
                        onBlur={() => commitMantra(idx)}
                        editable={!editingDisabled}
                        style={styles.mantraInput}
                        multiline
                        placeholder="Mantra"
                        placeholderTextColor={theme.colors.textSubtle}
                      />
                      <TouchableOpacity
                        onPress={() => removeMantra(idx)}
                        disabled={editingDisabled}
                        style={styles.mantraDeleteBtn}
                        hitSlop={8}
                      >
                        <Feather
                          name="x"
                          size={18}
                          color={theme.colors.textMuted}
                        />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={styles.defaultBadge}>« {m} »</Text>
                  )}
                </View>
              ))
            : null}
        </View>
        <View style={[styles.addRow, editingDisabled && styles.dimmed]}>
          <TextInput
            value={newMantra}
            onChangeText={setNewMantra}
            placeholder={
              isCustom
                ? 'Nouveau mantra…'
                : 'Ajoute le tien (remplace les défauts)…'
            }
            placeholderTextColor={theme.colors.textSubtle}
            style={styles.addInput}
            onSubmitEditing={addMantra}
            returnKeyType="done"
            editable={!editingDisabled}
          />
          <TouchableOpacity
            onPress={addMantra}
            disabled={editingDisabled || !newMantra.trim()}
            style={[
              styles.addBtn,
              (editingDisabled || !newMantra.trim()) && styles.addBtnDisabled,
            ]}
          >
            <Feather
              name="plus"
              size={22}
              color={theme.colors.textInverse}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
