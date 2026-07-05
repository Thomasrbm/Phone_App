// ── Design System: Jarvis ───────────────────────────────────────────

import type { TextStyle } from 'react-native';

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

// React-Native-compatible shadow preset (iOS shadow* + Android elevation
// in a single object, spreadable straight into a style).
export type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export type Elevation = {
  sm: ShadowStyle;
  md: ShadowStyle;
  lg: ShadowStyle;
};

// Named typographic roles. Spread onto a Text style; each carries the
// weight + line-height so callers don't reinvent them per screen.
export type TypoRole = {
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  lineHeight: number;
  letterSpacing?: number;
};

export type Typo = {
  display: TypoRole; // hero numbers / big screen titles
  title: TypoRole; // screen title (date, section screen)
  heading: TypoRole; // card / group heading
  body: TypoRole; // default reading text (task title)
  bodyStrong: TypoRole; // emphasised body (counts)
  label: TypoRole; // form labels, buttons
  caption: TypoRole; // secondary / subtitle text
  micro: TypoRole; // uppercase eyebrow labels
};

export type Motion = {
  duration: { fast: number; base: number; slow: number };
  spring: { damping: number; stiffness: number; mass: number };
};

export type Theme = {
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    section: number;
  };
  radius: { xs: number; sm: number; md: number; lg: number; pill: number };
  font: { xs: number; sm: number; md: number; lg: number; xl: number };
  elevation: Elevation;
  typo: Typo;
  motion: Motion;
};

// Shared scales (identical in both schemes) ──────────────────────────
const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, section: 48 };
const radius = { xs: 8, sm: 4, md: 8, lg: 16, pill: 999 };
const font = { xs: 10, sm: 12, md: 14, lg: 16, xl: 22 };

const typo: Typo = {
  display: { fontSize: 30, fontWeight: '800', lineHeight: 36, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  bodyStrong: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 17 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  micro: { fontSize: 10, fontWeight: '700', lineHeight: 13, letterSpacing: 0.6 },
};

const motion: Motion = {
  duration: { fast: 120, base: 220, slow: 340 },
  spring: { damping: 18, stiffness: 180, mass: 1 },
};

// Elevation is scheme-specific: on a dark background the same low-opacity
// black shadow is invisible, so dark needs a heavier, wider shadow to
// read at all.
const lightElevation: Elevation = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
};

const darkElevation: Elevation = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: {
    background: '#F2F3F5',
    surface: '#FFFFFF',
    // Was '#F2F3F5' — identical to `background`, so any surfaceAlt card
    // laid on the background was invisible. Now a touch darker than the
    // background so nested / secondary surfaces (progress track, chips)
    // read against both the background and white surfaces.
    surfaceAlt: '#E8EAEF',
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
  elevation: lightElevation,
  typo,
  motion,
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
  elevation: darkElevation,
  typo,
  motion,
};

export const theme = lightTheme;
