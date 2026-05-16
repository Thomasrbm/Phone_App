export type TaskColor = {
  id: string;
  value: string | null;
  label: string;
};

export const TASK_COLORS: TaskColor[] = [
  { id: 'none', value: null, label: 'Aucune' },
  { id: 'red', value: '#e03e3e', label: 'Rouge' },
  { id: 'orange', value: '#ea580c', label: 'Orange' },
  { id: 'yellow', value: '#dfab01', label: 'Jaune' },
  { id: 'green', value: '#0f7b6c', label: 'Vert' },
  { id: 'blue', value: '#0b6e99', label: 'Bleu' },
  { id: 'purple', value: '#6940a5', label: 'Violet' },
  { id: 'pink', value: '#ad1a72', label: 'Rose' },
];

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// Returns a soft tinted background derived from the task color.
// Blends the color with the provided base (surface) at the given ratio
// to produce an OPAQUE pastel — alpha-based transparency would let
// content behind (e.g. the swipe action) show through and break the
// swipe reveal animation.
//
// `base` should be the row surface color (white in light mode, dark
// gray in dark mode). `ratio` is the share of the task color in the
// blend (0..1). Lower = more subtle tint.
export function softColorBg(
  value: string | null,
  base: string = '#ffffff',
  ratio: number = 0.22
): string | undefined {
  if (!value) return undefined;
  const [r, g, b] = hexToRgb(value);
  const [br, bg, bb] = hexToRgb(base);
  const mix = (c: number, bc: number) =>
    Math.round(c * ratio + bc * (1 - ratio))
      .toString(16)
      .padStart(2, '0');
  return `#${mix(r, br)}${mix(g, bg)}${mix(b, bb)}`;
}
