import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  type TextLayoutEventData,
  type NativeSyntheticEvent,
  type TextStyle,
} from 'react-native';

type Props = {
  text: string;
  // Largest font size to try first. We shrink from here down to `min`.
  max?: number;
  min?: number;
  step?: number;
  style?: TextStyle;
};

// Renders text and progressively shrinks its font size until the
// content fits on a single line (or hits `min`). Useful when a mantra
// is just a few pixels too wide and orphan-wraps a trailing word.
export default function AutoSizeMantra({
  text,
  max = 22,
  min = 14,
  step = 1,
  style,
}: Props) {
  const [size, setSize] = useState(max);

  // Reset to the largest size whenever the text changes so we re-measure
  // from scratch.
  useEffect(() => {
    setSize(max);
  }, [text, max]);

  const handleLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const lines = e.nativeEvent.lines.length;
    if (lines > 1 && size > min) {
      setSize((s) => Math.max(min, s - step));
    }
  };

  return (
    <Text
      onTextLayout={handleLayout}
      style={[styles.base, style, { fontSize: size, lineHeight: size + 6 }]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    textAlign: 'center',
  },
});
