import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ObjectiveRow from '@/components/objectives/ObjectiveRow';
import type { Objective, ObjectiveHorizon } from '@/db/objectives';
import { softColorBg } from '@/lib/colors';
import { useTheme } from '@/lib/themeContext';

type Props = {
  horizon: ObjectiveHorizon;
  title: string;
  accent: string;
  objectives: Objective[];
  onToggle: (id: string, nextDone: boolean) => void;
  onOpen: (id: string) => void;
  onAdd: (title: string) => void;
};

// One coloured horizon block (Long terme / Moyen terme / Court terme).
// Owns: its add input, its header counter, the list of rows. The
// outer screen orchestrates the three sections side-by-side.
export default function ObjectiveHorizonSection({
  horizon,
  title,
  accent,
  objectives,
  onToggle,
  onOpen,
  onAdd,
}: Props) {
  const { theme } = useTheme();
  const [draft, setDraft] = useState('');

  const softBg =
    softColorBg(accent, theme.colors.background, 0.1) ?? theme.colors.surfaceAlt;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          backgroundColor: softBg,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.xs,
          marginBottom: theme.spacing.sm,
        },
        title: {
          fontSize: theme.font.sm,
          fontWeight: '700',
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        counter: {
          fontSize: theme.font.xs,
          fontWeight: '700',
          color: accent,
          letterSpacing: 0.5,
        },
        empty: {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          alignItems: 'center',
        },
        emptyText: {
          fontSize: theme.font.sm,
          color: theme.colors.textMuted,
          textAlign: 'center',
        },
        addRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: `${accent}40`,
        },
        addInput: {
          flex: 1,
          fontSize: theme.font.md,
          color: theme.colors.text,
          paddingVertical: 4,
        },
        addBtn: {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: theme.spacing.sm,
        },
      }),
    [theme, accent, softBg]
  );

  const total = objectives.length;
  const done = objectives.filter((o) => o.done).length;

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft('');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {total > 0 ? (
          <Text style={styles.counter}>
            {done}/{total}
          </Text>
        ) : null}
      </View>
      {objectives.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Aucun objectif {horizon === 'long' ? 'long' : horizon === 'medium' ? 'moyen' : 'court'} terme.
          </Text>
        </View>
      ) : (
        objectives.map((o) => (
          <ObjectiveRow
            key={o.id}
            objective={o}
            accent={accent}
            onToggle={onToggle}
            onPress={onOpen}
          />
        ))
      )}
      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Nouvel objectif…"
          placeholderTextColor={theme.colors.textSubtle}
          style={styles.addInput}
          returnKeyType="done"
          onSubmitEditing={submit}
          blurOnSubmit={false}
        />
        <TouchableOpacity onPress={submit} style={styles.addBtn} hitSlop={8}>
          <Feather name="plus" size={16} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
