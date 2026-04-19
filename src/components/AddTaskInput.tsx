import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { TASK_COLORS } from '@/lib/colors';
import { theme } from '@/lib/theme';

const BASE_HEIGHT = 380;
const MID_HEIGHT = 540;
const MIN_HEIGHT = 220;
const HORIZONTAL_EXIT_THRESHOLD = 80;

type SubmitParams = {
  title: string;
  description: string | null;
  color: string | null;
};

type Props = {
  onSubmit: (params: SubmitParams) => void;
};

export default function AddTaskInput({ onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const titleRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);

  const winH = useWindowDimensions().height;
  const maxHeight = useMemo(() => Math.round(winH * 0.92), [winH]);

  const height = useSharedValue(BASE_HEIGHT);
  const startHeight = useSharedValue(BASE_HEIGHT);
  const maxHeightSV = useSharedValue(maxHeight);
  const midHeightSV = useSharedValue(MID_HEIGHT);

  useEffect(() => {
    maxHeightSV.value = maxHeight;
  }, [maxHeight, maxHeightSV]);

  useEffect(() => {
    if (open) {
      height.value = BASE_HEIGHT;
      const t = setTimeout(() => titleRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open, height]);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      setOpen(false);
    });
    return () => sub.remove();
  }, []);

  const canSubmit = title.trim().length > 0;

  const close = () => {
    titleRef.current?.blur();
    descRef.current?.blur();
    Keyboard.dismiss();
    setOpen(false);
  };

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      color,
    });
    setTitle('');
    setDescription('');
    setColor(null);
    close();
  };

  const cancel = () => close();

  const pickColor = (c: string | null) => {
    setColor(c);
    titleRef.current?.focus();
    // Tapping a color expands the form to mid-height (if currently small)
    // so the user gets more room for the description right after picking.
    if (height.value < MID_HEIGHT - 10) {
      height.value = withSpring(MID_HEIGHT, { damping: 20, stiffness: 180 });
    }
  };

  const verticalPan = Gesture.Pan()
    .activeOffsetY([-5, 5])
    .failOffsetX([-30, 30])
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      startHeight.value = height.value;
    })
    .onUpdate((e) => {
      const next = startHeight.value - e.translationY;
      height.value = Math.max(MIN_HEIGHT, Math.min(maxHeightSV.value, next));
    })
    .onEnd(() => {
      // Snap to nearest of BASE / MID / MAX
      const targets = [BASE_HEIGHT, midHeightSV.value, maxHeightSV.value];
      let best = targets[0];
      let bestDist = Math.abs(targets[0] - height.value);
      for (let i = 1; i < targets.length; i++) {
        const d = Math.abs(targets[i] - height.value);
        if (d < bestDist) {
          best = targets[i];
          bestDist = d;
        }
      }
      height.value = withSpring(best, { damping: 20, stiffness: 180 });
    });

  // Horizontal swipe to exit fullscreen (collapse to BASE)
  const horizontalSwipe = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (
        Math.abs(e.translationX) > HORIZONTAL_EXIT_THRESHOLD &&
        height.value > BASE_HEIGHT + 40
      ) {
        height.value = withSpring(BASE_HEIGHT, {
          damping: 20,
          stiffness: 180,
        });
      }
    });

  const dragGesture = Gesture.Race(verticalPan, horizontalSwipe);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  if (!open) {
    return (
      <TouchableOpacity
        style={styles.collapsed}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.collapsedText}>Ajouter une nouvelle tâche</Text>
        <View style={styles.btnSmall}>
          <Feather name="plus" size={40} color={theme.colors.textInverse} />
        </View>
      </TouchableOpacity>
    );
  }

  const cycleHeight = () => {
    const order = [BASE_HEIGHT, MID_HEIGHT, maxHeight];
    const current = height.value;
    let next = order[0];
    // Pick the next stop > current; wrap to BASE if at top
    for (const h of order) {
      if (h > current + 20) {
        next = h;
        break;
      }
      next = order[0];
    }
    height.value = withSpring(next, { damping: 20, stiffness: 180 });
  };

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View style={[styles.expanded, animatedStyle]}>
        <TouchableOpacity
          onPress={cycleHeight}
          activeOpacity={0.6}
          style={styles.dragHandleArea}
        >
          <View style={styles.dragHandleBar} />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={cancel} style={styles.iconBtn} hitSlop={8}>
            <Feather name="x" size={22} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TextInput
            ref={titleRef}
            value={title}
            onChangeText={setTitle}
            placeholder="Titre de la tâche"
            placeholderTextColor={theme.colors.textSubtle}
            style={styles.titleInput}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={submit}
            disabled={!canSubmit}
            style={[styles.btnPrimary, !canSubmit && styles.btnDisabled]}
          >
            <Feather name="plus" size={22} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>
        <View style={styles.contentArea}>
          <Text style={styles.label}>Couleur</Text>
          <View style={styles.colorRow}>
            {TASK_COLORS.map((c) => {
              const selected = c.value === color;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => pickColor(c.value)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c.value ?? theme.colors.surfaceAlt },
                    selected && styles.colorDotSelected,
                    !c.value && styles.colorDotNone,
                  ]}
                >
                  {selected ? (
                    <Feather
                      name="check"
                      size={16}
                      color={
                        c.value ? theme.colors.textInverse : theme.colors.text
                      }
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.label, styles.labelDesc]}>Description</Text>
          <TextInput
            ref={descRef}
            value={description}
            onChangeText={setDescription}
            placeholder="Notes, contexte, détails…"
            placeholderTextColor={theme.colors.textSubtle}
            style={styles.descInput}
            multiline
            textAlignVertical="top"
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  collapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
  },
  collapsedText: {
    flex: 1,
    fontSize: theme.font.md,
    color: theme.colors.textMuted,
  },
  btnSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expanded: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  dragHandleArea: {
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandleBar: {
    width: 70,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.textSubtle,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderSubtle,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: {
    flex: 1,
    fontSize: theme.font.lg,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    marginHorizontal: theme.spacing.xs,
  },
  btnPrimary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  contentArea: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  label: {
    fontSize: theme.font.xs,
    color: theme.colors.textSubtle,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  labelDesc: {
    marginTop: theme.spacing.lg,
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
  descInput: {
    flex: 1,
    fontSize: theme.font.md,
    color: theme.colors.text,
    minHeight: 60,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
});
