import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { VariableContextProvider, useColorScheme as useNativeWindColorScheme } from 'nativewind';
import {
  THEMES,
  DEFAULT_THEME_ID,
  ThemeDefinition,
  ThemeId,
  getThemeById,
} from '@/constants/theme';
import { loadData, saveData } from '@/lib/storage';

// Keep the storage key stable so existing users retain their selected theme across the Jeevya rebrand.
const THEME_STORAGE_KEY = '@jeevya_selected_theme_id';

interface ThemeContextValue {
  theme: ThemeDefinition;
  themeId: ThemeId;
  setTheme: (id: ThemeId) => Promise<void>;
  isDark: boolean;
  themes: ThemeDefinition[];
}

type ThemeVariables = Record<`--${string}`, string>;

function toRgbChannels(hex: string): string {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((channel) => `${channel}${channel}`).join('')
    : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `${red} ${green} ${blue}`;
}

function createThemeVariables(theme: ThemeDefinition): ThemeVariables {
  const { colors } = theme;
  return {
    '--primary': toRgbChannels(colors.primary),
    '--primary-foreground': toRgbChannels(colors.primaryForeground),
    '--background': toRgbChannels(colors.background),
    '--foreground': toRgbChannels(colors.text),
    '--card': toRgbChannels(colors.card),
    '--card-foreground': toRgbChannels(colors.text),
    '--popover': toRgbChannels(colors.card),
    '--popover-foreground': toRgbChannels(colors.text),
    '--secondary': toRgbChannels(colors.secondary),
    '--secondary-foreground': toRgbChannels(colors.secondaryForeground),
    '--accent': toRgbChannels(colors.accent),
    '--accent-foreground': toRgbChannels(colors.primary),
    '--muted': toRgbChannels(colors.backgroundElement),
    '--muted-foreground': toRgbChannels(colors.textSecondary),
    '--border': toRgbChannels(colors.border),
    '--input': toRgbChannels(colors.border),
    '--ring': toRgbChannels(colors.primary),
    '--destructive': toRgbChannels(colors.danger),
    '--destructive-foreground': toRgbChannels(colors.primaryForeground),
    '--success': toRgbChannels(colors.success),
    '--success-foreground': toRgbChannels(colors.primaryForeground),
    '--warning': toRgbChannels(colors.warning),
    '--warning-foreground': toRgbChannels(colors.text),
    '--info': toRgbChannels(colors.info),
    '--info-foreground': toRgbChannels(colors.primaryForeground),
  };
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: getThemeById(DEFAULT_THEME_ID),
  themeId: DEFAULT_THEME_ID,
  setTheme: async () => {},
  isDark: false,
  themes: THEMES,
});

export function JeevyaThemeProvider({ children }: { children: React.ReactNode }) {
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

  const themeVariables = createThemeVariables(theme);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeId,
        setTheme,
        isDark,
        themes: THEMES,
      }}>
      <VariableContextProvider value={themeVariables}>
        {children}
      </VariableContextProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
