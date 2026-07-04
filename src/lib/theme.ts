// ── Design System: Jarvis ───────────────────────────────────────────

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
    background: '#F2F3F5',
    surface: '#FFFFFF',
    surfaceAlt: '#F2F3F5',
    text: '#1C1C1E',
    textMuted: '#8E8E93',
    textSubtle: '#AEAEB2',
    textInverse: '#FFFFFF',
    border: '#D1D1D6',
    borderSubtle: '#E5E5EA',
    accent: '#007AFF',
    done: '#34C759',
    doneSoft: '#E8F8ED',
    pending: '#FF9500',
    pendingSoft: '#FFF3E0',
    today: '#FF3B30',
    todaySoft: '#FFE8E6',
    routine: '#30D158',
    routineSoft: '#E6FAEA',
    objectiveLong: '#FF453A',
    objectiveMedium: '#FF9F0A',
    objectiveShort: '#0A84FF',
    selectionBg: '#E8F1FF',
    swipeBlendBase: '#FFFFFF',
  },
  spacing,
  radius,
  font,
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: {
    background: '#0E0E0E',
    surface: '#1C1C1E',
    surfaceAlt: '#2C2C2E',
    text: '#F2F2F7',
    textMuted: '#8E8E93',
    textSubtle: '#636366',
    textInverse: '#FFFFFF',
    border: '#38383A',
    borderSubtle: '#2C2C2E',
    accent: '#0A84FF',
    done: '#30D158',
    doneSoft: '#1A3A22',
    pending: '#FF9F0A',
    pendingSoft: '#3A2E14',
    today: '#FF453A',
    todaySoft: '#3A1E1C',
    routine: '#30D158',
    routineSoft: '#1A3A22',
    objectiveLong: '#FF453A',
    objectiveMedium: '#FF9F0A',
    objectiveShort: '#0A84FF',
    selectionBg: '#1A2A44',
    swipeBlendBase: '#1C1C1E',
  },
  spacing,
  radius,
  font,
};

export const theme = lightTheme;
