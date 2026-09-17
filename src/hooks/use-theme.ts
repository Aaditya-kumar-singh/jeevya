import { useThemeContext } from '@/lib/themeContext';

export function useTheme() {
  const context = useThemeContext();
  const { theme, themeId, setTheme, isDark, themes } = context;

  return {
    ...theme.colors,
    theme,
    themeId,
    setTheme,
    isDark,
    themes,
    // Backwards-compatible legacy properties
    text: theme.colors.text,
    background: theme.colors.background,
    backgroundElement: theme.colors.backgroundElement,
    backgroundSelected: theme.colors.backgroundSelected,
    textSecondary: theme.colors.textSecondary,
  };
}
