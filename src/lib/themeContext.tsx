import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type Theme } from './theme';
import { getSetting, setSetting } from '@/db/settings';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'theme_mode';

function isThemeMode(v: string | null): v is ThemeMode {
  return v === 'system' || v === 'light' || v === 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSetting(STORAGE_KEY).then((stored) => {
      if (cancelled) return;
      if (isThemeMode(stored)) setModeState(stored);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    setSetting(STORAGE_KEY, next);
  }, []);

  const theme = useMemo<Theme>(() => {
    const effective =
      mode === 'system' ? (systemScheme ?? 'light') : mode;
    return effective === 'dark' ? darkTheme : lightTheme;
  }, [mode, systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, setMode, ready }),
    [theme, mode, setMode, ready]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
