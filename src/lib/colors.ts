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
