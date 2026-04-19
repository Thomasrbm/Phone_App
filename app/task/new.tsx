import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TASK_COLORS } from '@/lib/colors';
import { createTask } from '@/db/tasks';
import { theme } from '@/lib/theme';

export default function NewTaskScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const router = useRouter();
  const headerHeight = useHeaderHeight();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0;

  const submit = async () => {
    if (!canSubmit || !day) return;
    await createTask({
      day,
      title: title.trim(),
      description: description.trim() || null,
      color,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Nouvelle tâche',
          headerBackTitle: 'Retour',
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.label}>Titre</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Que faut-il faire ?"
              placeholderTextColor={theme.colors.textSubtle}
              style={styles.titleInput}
              autoFocus
              returnKeyType="next"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Couleur</Text>
            <View style={styles.colorRow}>
              {TASK_COLORS.map((c) => {
                const selected = c.value === color;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setColor(c.value)}
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: c.value ?? theme.colors.surfaceAlt,
                      },
                      selected && styles.colorDotSelected,
                      !c.value && styles.colorDotNone,
                    ]}
                  >
                    {selected ? (
                      <Feather
                        name="check"
                        size={16}
                        color={
                          c.value
                            ? theme.colors.textInverse
                            : theme.colors.text
                        }
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Notes, contexte, détails…"
              placeholderTextColor={theme.colors.textSubtle}
              style={styles.descInput}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <TouchableOpacity
          onPress={submit}
          disabled={!canSubmit}
          style={[styles.fab, !canSubmit && styles.fabDisabled]}
          activeOpacity={0.8}
        >
          <Feather
            name="check"
            size={28}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.font.xs,
    color: theme.colors.textSubtle,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  titleInput: {
    fontSize: theme.font.xl,
    color: theme.colors.text,
    fontWeight: '600',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotNone: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: theme.colors.text,
  },
  descInput: {
    fontSize: theme.font.lg,
    color: theme.colors.text,
    minHeight: 120,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabDisabled: {
    backgroundColor: theme.colors.textSubtle,
    shadowOpacity: 0.1,
  },
});
