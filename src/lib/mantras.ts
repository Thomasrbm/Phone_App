import { getSetting, setSetting } from '@/db/settings';

const STORAGE_KEY = 'mantras';
const ENABLED_KEY = 'mantras_enabled';

export const DEFAULT_MANTRAS: string[] = [
  'Avance d\'un pas. Chaque jour.',
  'Fais aujourd\'hui ce que tu remercieras demain.',
  'Discipline avant motivation.',
];

export type MantrasState = {
  list: string[];
  isCustom: boolean;
};

export async function getMantras(): Promise<MantrasState> {
  const raw = await getSetting(STORAGE_KEY);
  if (!raw) return { list: DEFAULT_MANTRAS, isCustom: false };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((m) => typeof m === 'string')) {
      if (parsed.length === 0) return { list: DEFAULT_MANTRAS, isCustom: false };
      return { list: parsed, isCustom: true };
    }
    return { list: DEFAULT_MANTRAS, isCustom: false };
  } catch {
    return { list: DEFAULT_MANTRAS, isCustom: false };
  }
}

export async function setMantras(mantras: string[]): Promise<void> {
  await setSetting(STORAGE_KEY, JSON.stringify(mantras));
}

export async function getMantrasEnabled(): Promise<boolean> {
  const raw = await getSetting(ENABLED_KEY);
  if (raw === null) return true;
  return raw === 'true';
}

export async function setMantrasEnabled(enabled: boolean): Promise<void> {
  await setSetting(ENABLED_KEY, enabled ? 'true' : 'false');
}

// Deterministic mantra-of-the-day: same key (day) always picks the same
// index. The mantra rotates daily but stays stable while the user is on
// the screen — no jitter on focus changes.
export function pickMantraForDay(day: string, mantras: string[]): string {
  if (mantras.length === 0) return '';
  let h = 0;
  for (let i = 0; i < day.length; i++) {
    h = (h * 31 + day.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % mantras.length;
  return mantras[idx];
}
