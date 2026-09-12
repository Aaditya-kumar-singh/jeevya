export const colors = {
  light: {
    background: '#F8F9FB',
    foreground: '#111318',
    card: '#FFFFFF',
    muted: '#6B7280',
    border: '#E5E7EB',
    primary: '#111318',
    primaryForeground: '#FFFFFF',

    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#2563EB',

    health: '#EF4444',
    finance: '#10B981',
    productivity: '#6366F1',
    growth: '#8B5CF6',
  },

  dark: {
    background: '#0B0D10',
    foreground: '#F5F7FA',
    card: '#15181D',
    muted: '#9CA3AF',
    border: '#272B33',
    primary: '#F5F7FA',
    primaryForeground: '#0B0D10',

    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',

    health: '#F87171',
    finance: '#34D399',
    productivity: '#818CF8',
    growth: '#A78BFA',
  },
} as const;

export type ColorScheme = keyof typeof colors;

