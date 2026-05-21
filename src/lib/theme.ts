export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  border: string;
  borderSubtle: string;
  accent: string;
  done: string;
  doneSoft: string;
  pending: string;
  pendingSoft: string;
  today: string;
  todaySoft: string;
  routine: string;
  routineSoft: string;
  // Objectives are categorised by horizon and rendered with distinct
  // accent colours per horizon. Long = red (urgent / important framing),
  // medium = orange (transitional), short = light blue (calm / soon).
  objectiveLong: string;
  objectiveMedium: string;
  objectiveShort: string;
  selectionBg: string;
  swipeBlendBase: string;
};

export type Theme = {
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  radius: { sm: number; md: number; lg: number; pill: number };
  font: { xs: number; sm: number; md: number; lg: number; xl: number };
};

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const radius = { sm: 4, md: 8, lg: 14, pill: 999 };
const font = { xs: 10, sm: 12, md: 14, lg: 16, xl: 22 };

export const lightTheme: Theme = {
  scheme: 'light',
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    surfaceAlt: '#f7f7f5',
    text: '#37352f',
    textMuted: '#787774',
    textSubtle: '#9b9a97',
    textInverse: '#ffffff',
    border: '#ebebea',
    borderSubtle: '#f1f1ef',
    accent: '#2383e2',
    done: '#0f7b6c',
    doneSoft: '#e0efe4',
    pending: '#d9730d',
    pendingSoft: '#fbecdd',
    today: '#ea580c',
    todaySoft: '#fff1e6',
    routine: '#0d8a3f',
    routineSoft: '#e3f1e7',
    objectiveLong: '#dc2626',
    objectiveMedium: '#ea580c',
    objectiveShort: '#3b82f6',
    selectionBg: '#dde9f1',
    swipeBlendBase: '#ffffff',
  },
  spacing,
  radius,
  font,
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: {
    background: '#191919',
    surface: '#202020',
    surfaceAlt: '#2a2a2a',
    text: '#e8e6e3',
    textMuted: '#9b9a97',
    textSubtle: '#6f6e6b',
    textInverse: '#ffffff',
    border: '#2f2f2f',
    borderSubtle: '#252525',
    accent: '#4a9eff',
    done: '#4eb1a0',
    doneSoft: '#1d3a35',
    pending: '#e8a04c',
    pendingSoft: '#3a2f1d',
    today: '#ff7a3d',
    todaySoft: '#3a2218',
    routine: '#4ade80',
    routineSoft: '#1a3a24',
    objectiveLong: '#f87171',
    objectiveMedium: '#fb923c',
    objectiveShort: '#60a5fa',
    selectionBg: '#2a3a4a',
    swipeBlendBase: '#202020',
  },
  spacing,
  radius,
  font,
};

// Kept for legacy non-React consumers (e.g. babel-resolved imports
// in modules that don't have access to the hook). Always returns the
// light palette — components must use `useTheme()` for reactivity.
export const theme = lightTheme;
