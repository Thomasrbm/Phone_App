import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCallback, useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TASK_COLORS } from '@/lib/colors';
import { theme } from '@/lib/theme';
import {
  getTaskById,
  softDeleteTask,
  updateTask,
  type Task,
} from '@/db/tasks';

export default function TaskEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const headerHeight = useHeaderHeight();

  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getTaskById(id).then((t) => {
        if (cancelled || !t) return;
        setTask(t);
        setTitle(t.title);
        setDescription(t.description ?? '');
        setColor(t.color);
      });
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  // Auto-save color the moment it changes
  useEffect(() => {
    if (!task) return;
    if (color === task.color) return;
    updateTask(id, { color });
  }, [color, task, id]);

  // Animate layout on keyboard show/hide for smooth transitions
  useEffect(() => {
    const smooth = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    };
    const showSub = Keyboard.addListener('keyboardDidShow', smooth);
    const hideSub = Keyboard.addListener('keyboardDidHide', smooth);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const saveTitle = () => {
    if (!task) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) return;
    updateTask(id, { title: trimmed });
  };

  const saveDescription = () => {
    if (!task) return;
    const next = description.trim() === '' ? null : description;
    if (next === task.description) return;
    updateTask(id, { description: next });
  };

  const handleDelete = async () => {
    if (!task) return;
    await softDeleteTask(id);
    router.back();
  };

  const headerTitle = task
    ? format(parseISO(task.day), 'd MMMM', { locale: fr })
    : '';

  const backOnSwipe = () => router.back();

  const { width: winW, height: winH } = useWindowDimensions();
  const tX = useSharedValue(0);
  const tY = useSharedValue(0);

  const swipeBackGesture = Gesture.Pan()
    .minDistance(8)
    .shouldCancelWhenOutside(false)
    .onUpdate((e) => {
      tX.value = e.translationX;
      tY.value = e.translationY;
    })
    .onEnd((e) => {
      const H_THRESH = 100;
      const V_THRESH = 150;
      if (Math.abs(e.translationX) > H_THRESH) {
        const dir = e.translationX > 0 ? 1 : -1;
        tX.value = withTiming(
          dir * winW,
          { duration: 220 },
          (finished) => {
            if (finished) runOnJS(backOnSwipe)();
          }
        );
      } else if (Math.abs(e.translationY) > V_THRESH) {
        const dir = e.translationY > 0 ? 1 : -1;
        tY.value = withTiming(
          dir * winH,
          { duration: 220 },
          (finished) => {
            if (finished) runOnJS(backOnSwipe)();
          }
        );
      } else {
        tX.value = withSpring(0, { damping: 20, stiffness: 200 });
        tY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const screenAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: tX.value }, { translateY: tY.value }],
  }));

  return (
    <GestureDetector gesture={swipeBackGesture}>
    <Animated.View style={[styles.animWrap, screenAnim]}>
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: headerTitle,
          headerBackTitle: 'Retour',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          presentation: 'transparentModal',
          animation: 'fade',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerCloseBtn}
              hitSlop={8}
            >
              <Feather name="x" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <View style={styles.content}>
          <View style={styles.main}>
            <View style={styles.section}>
              <Text style={styles.label}>Titre</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                onBlur={saveTitle}
                style={styles.titleInput}
                placeholder="Titre de la tâche"
                placeholderTextColor={theme.colors.textSubtle}
                returnKeyType="done"
                disableFullscreenUI
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
                          backgroundColor:
                            c.value ?? theme.colors.surfaceAlt,
                        },
                        selected && styles.colorDotSelected,
                        !c.value && styles.colorDotNone,
                      ]}
                    >
                      {selected ? (
                        <Text
                          style={[
                            styles.colorCheck,
                            !c.value && styles.colorCheckNone,
                          ]}
                        >
                          ✓
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.descSection}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                onBlur={saveDescription}
                style={styles.descInput}
                placeholder="Notes, contexte, détails…"
                placeholderTextColor={theme.colors.textSubtle}
                multiline
                textAlignVertical="top"
                disableFullscreenUI
              />
            </View>
          </View>

          <View style={styles.footer}>
            {task?.done && task.doneAt ? (
              <Text style={styles.doneInfo}>
                Validée le{' '}
                {format(parseISO(task.doneAt), "d MMMM 'à' HH:mm", {
                  locale: fr,
                })}
              </Text>
            ) : null}
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Supprimer la tâche</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      {/* Dedicated edge zones above everything so horizontal swipe
          always works (even over the description TextInput). */}
      <GestureDetector gesture={swipeBackGesture}>
        <View style={styles.leftEdge} />
      </GestureDetector>
      <GestureDetector gesture={swipeBackGesture}>
        <View style={styles.rightEdge} />
      </GestureDetector>
    </SafeAreaView>
    </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  animWrap: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 80,
  },
  main: {
    flex: 1,
    overflow: 'hidden',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  descSection: {
    flex: 1,
    overflow: 'hidden',
  },
  footer: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  label: {
    fontSize: theme.font.xs,
    color: theme.colors.textSubtle,
    fontWeight: '600',
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
  descInput: {
    flex: 1,
    flexShrink: 1,
    fontSize: theme.font.lg,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    textAlignVertical: 'top',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  colorCheck: {
    color: theme.colors.textInverse,
    fontSize: theme.font.md,
    fontWeight: '800',
  },
  colorCheckNone: {
    color: theme.colors.text,
  },
  doneInfo: {
    fontSize: theme.font.md,
    color: theme.colors.done,
    fontWeight: '500',
  },
  deleteBtn: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
  },
  headerCloseBtn: {
    paddingHorizontal: theme.spacing.md,
  },
  leftEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
    zIndex: 10,
  },
  rightEdge: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
    zIndex: 10,
  },
  deleteText: {
    color: theme.colors.today,
    fontSize: theme.font.md,
    fontWeight: '600',
  },
});
