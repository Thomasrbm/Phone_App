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

// Returns a soft tinted background derived from the task color.
// Blends the color with white at ~22% ratio to produce an OPAQUE pastel.
// Alpha-based transparency would let content behind (e.g. the swipe
// action) show through, breaking the swipe reveal animation.
export function softColorBg(value: string | null): string | undefined {
  if (!value) return undefined;
  const r = parseInt(value.slice(1, 3), 16);
  const g = parseInt(value.slice(3, 5), 16);
  const b = parseInt(value.slice(5, 7), 16);
  const ratio = 0.22;
  const blend = (c: number) =>
    Math.round(c * ratio + 255 * (1 - ratio))
      .toString(16)
      .padStart(2, '0');
  return `#${blend(r)}${blend(g)}${blend(b)}`;
}
