import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ResolvedScheme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedScheme: ResolvedScheme;
}

const STORAGE_KEY = 'openspot_theme_mode_v1';
const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

function getAutoSchemeByTime(date: Date = new Date()): ResolvedScheme {
  const hour = date.getHours();
  return hour >= 7 && hour < 19 ? 'light' : 'dark';
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    const loadMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted || !stored) return;
        if (stored === 'light' || stored === 'dark' || stored === 'auto') {
          setModeState(stored);
        }
      } catch (error) {
        console.error('Failed to load theme mode:', error);
      }
    };
    void loadMode();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'auto') return;
    const timer = setInterval(() => setTick((prev) => prev + 1), 60000);
    return () => clearInterval(timer);
  }, [mode]);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch((error) => {
      console.error('Failed to save theme mode:', error);
    });
  };

  const resolvedScheme: ResolvedScheme = useMemo(() => {
    void tick;
    if (mode === 'light') return 'light';
    if (mode === 'dark') return 'dark';
    return getAutoSchemeByTime();
  }, [mode, tick]);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, resolvedScheme }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return context;
}

