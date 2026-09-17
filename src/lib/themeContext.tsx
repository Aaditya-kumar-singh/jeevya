import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import {
  THEMES,
  DEFAULT_THEME_ID,
  ThemeDefinition,
  ThemeId,
  getThemeById,
} from '@/constants/theme';
import { loadData, saveData } from '@/lib/storage';

const THEME_STORAGE_KEY = '@lifeos_selected_theme_id';

interface ThemeContextValue {
  theme: ThemeDefinition;
  themeId: ThemeId;
  setTheme: (id: ThemeId) => Promise<void>;
  isDark: boolean;
  themes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: getThemeById(DEFAULT_THEME_ID),
  themeId: DEFAULT_THEME_ID,
  setTheme: async () => {},
  isDark: false,
  themes: THEMES,
});

export function LifeOSThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const { setColorScheme } = useNativeWindColorScheme();

  // Load saved theme from storage on mount
  useEffect(() => {
    let isMounted = true;
    async function initTheme() {
      try {
        const savedId = await loadData<string>(THEME_STORAGE_KEY, DEFAULT_THEME_ID);
        if (isMounted && savedId) {
          const matched = THEMES.find((t) => t.id === savedId);
          if (matched) {
            setThemeIdState(matched.id);
            setColorScheme(matched.mode);
          }
        }
      } catch {
        // Fallback to default
      }
    }
    void initTheme();
    return () => {
      isMounted = false;
    };
  }, [setColorScheme]);

  const setTheme = useCallback(
    async (newId: ThemeId) => {
      const selected = getThemeById(newId);
      setThemeIdState(selected.id);
      setColorScheme(selected.mode);
      await saveData(THEME_STORAGE_KEY, selected.id);
    },
    [setColorScheme],
  );

  const theme = getThemeById(themeId);
  const isDark = theme.mode === 'dark';

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeId,
        setTheme,
        isDark,
        themes: THEMES,
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
