/**
 * LifeOS Theme System
 * Defines 10 themes spanning Classic, Simple, Advanced, and Animated aesthetics.
 */

import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// ─── 10 Complete Theme Definitions ──────────────────────────────────────────

export type ThemeCategory = 'classic' | 'simple' | 'advanced' | 'animated';
export type ThemeMode = 'light' | 'dark';
export type AnimationType = 'pulse' | 'aurora' | 'nebula' | 'none';

export type ThemeId =
  | 'classic-light'
  | 'midnight-cyber'
  | 'nordic-frost'
  | 'tokyo-neon'
  | 'solarized-paper'
  | 'emerald-zen'
  | 'sunset-horizon'
  | 'obsidian-stealth'
  | 'cosmic-nebula'
  | 'champagne-luxe';

export interface ThemeColors {
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentGlow: string;
  border: string;
  // Semantic
  success: string;
  warning: string;
  danger: string;
  info: string;
  // Domains
  health: string;
  finance: string;
  productivity: string;
  growth: string;
  // Gradients [Start, Mid, End]
  gradient: [string, string, string];
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  category: ThemeCategory;
  mode: ThemeMode;
  isAnimated: boolean;
  animationType: AnimationType;
  colors: ThemeColors;
  previewCardBg: string;
  accentBadge: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'classic-light',
    name: 'LifeOS Classic',
    tagline: 'Clean indigo-violet and sky balanced for daily focus',
    category: 'classic',
    mode: 'light',
    isAnimated: false,
    animationType: 'none',
    accentBadge: 'Default',
    previewCardBg: '#FFFFFF',
    colors: {
      background: '#FAFAFF',
      backgroundElement: '#F0F0F8',
      backgroundSelected: '#E0E2F5',
      card: '#FFFFFF',
      cardBorder: '#E2E3F0',
      text: '#0F0F19',
      textSecondary: '#6B7280',
      primary: '#6366F1',
      primaryForeground: '#FFFFFF',
      secondary: '#EEF0FD',
      secondaryForeground: '#4338CA',
      accent: '#38BDF8',
      accentGlow: 'rgba(99, 102, 241, 0.25)',
      border: '#E5E7EB',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#F43F5E',
      info: '#38BDF8',
      health: '#EF4444',
      finance: '#10B981',
      productivity: '#6366F1',
      growth: '#8B5CF6',
      gradient: ['#6366F1', '#818CF8', '#38BDF8'],
    },
  },
  {
    id: 'midnight-cyber',
    name: 'Midnight Cyber',
    tagline: 'Futuristic glassmorphism with electric cyan and neon purple',
    category: 'advanced',
    mode: 'dark',
    isAnimated: false,
    animationType: 'none',
    accentBadge: 'Cyberpunk',
    previewCardBg: '#12141F',
    colors: {
      background: '#090A0F',
      backgroundElement: '#141724',
      backgroundSelected: '#1F2438',
      card: '#12141F',
      cardBorder: '#232840',
      text: '#F1F5F9',
      textSecondary: '#94A3B8',
      primary: '#00F5D4',
      primaryForeground: '#090A0F',
      secondary: '#1A2138',
      secondaryForeground: '#00F5D4',
      accent: '#7928CA',
      accentGlow: 'rgba(0, 245, 212, 0.35)',
      border: '#1E2337',
      success: '#00F5D4',
      warning: '#FBBF24',
      danger: '#FF0055',
      info: '#38BDF8',
      health: '#FF0055',
      finance: '#00F5D4',
      productivity: '#7928CA',
      growth: '#A855F7',
      gradient: ['#7928CA', '#00F5D4', '#0EA5E9'],
    },
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    tagline: 'Calm Scandinavian snow, cool slate, and arctic glacier blue',
    category: 'simple',
    mode: 'light',
    isAnimated: false,
    animationType: 'none',
    accentBadge: 'Minimal',
    previewCardBg: '#FFFFFF',
    colors: {
      background: '#F1F5F9',
      backgroundElement: '#E2E8F0',
      backgroundSelected: '#CBD5E1',
      card: '#FFFFFF',
      cardBorder: '#CBD5E1',
      text: '#0F172A',
      textSecondary: '#64748B',
      primary: '#0284C7',
      primaryForeground: '#FFFFFF',
      secondary: '#E0F2FE',
      secondaryForeground: '#0369A1',
      accent: '#0D9488',
      accentGlow: 'rgba(2, 132, 199, 0.2)',
      border: '#E2E8F0',
      success: '#059669',
      warning: '#D97706',
      danger: '#E11D48',
      info: '#0284C7',
      health: '#F43F5E',
      finance: '#0D9488',
      productivity: '#0284C7',
      growth: '#6366F1',
      gradient: ['#0284C7', '#38BDF8', '#E0F2FE'],
    },
  },
  {
    id: 'tokyo-neon',
    name: 'Tokyo Neon',
    tagline: 'Vibrant synthwave night with dynamic breathing neon aura',
    category: 'animated',
    mode: 'dark',
    isAnimated: true,
    animationType: 'pulse',
    accentBadge: 'Animated Glow',
    previewCardBg: '#15102A',
    colors: {
      background: '#0D0B18',
      backgroundElement: '#1B1633',
      backgroundSelected: '#29224D',
      card: '#15102A',
      cardBorder: '#362A63',
      text: '#F8FAFC',
      textSecondary: '#A78BFA',
      primary: '#F43F5E',
      primaryForeground: '#FFFFFF',
      secondary: '#2E1A47',
      secondaryForeground: '#F43F5E',
      accent: '#A855F7',
      accentGlow: 'rgba(244, 63, 94, 0.45)',
      border: '#2C224D',
      success: '#10B981',
      warning: '#FBBF24',
      danger: '#F43F5E',
      info: '#06B6D4',
      health: '#F43F5E',
      finance: '#10B981',
      productivity: '#A855F7',
      growth: '#EC4899',
      gradient: ['#F43F5E', '#A855F7', '#3B82F6'],
    },
  },
  {
    id: 'solarized-paper',
    name: 'Solarized Paper',
    tagline: 'Warm soothing ivory paper, terracotta tones, and espresso ink',
    category: 'simple',
    mode: 'light',
    isAnimated: false,
    animationType: 'none',
    accentBadge: 'Editorial',
    previewCardBg: '#FFFDF9',
    colors: {
      background: '#F8F4EB',
      backgroundElement: '#EFE7D8',
      backgroundSelected: '#E3D7C3',
      card: '#FFFDF9',
      cardBorder: '#DDD1BC',
      text: '#292524',
      textSecondary: '#78716C',
      primary: '#C2410C',
      primaryForeground: '#FFFFFF',
      secondary: '#FFEDD5',
      secondaryForeground: '#9A3412',
      accent: '#D97706',
      accentGlow: 'rgba(194, 65, 12, 0.2)',
      border: '#E7DFD0',
      success: '#15803D',
      warning: '#B45309',
      danger: '#B91C1C',
      info: '#0369A1',
      health: '#DC2626',
      finance: '#15803D',
      productivity: '#C2410C',
      growth: '#7C2D12',
      gradient: ['#C2410C', '#EA580C', '#FDBA74'],
    },
  },
  {
    id: 'emerald-zen',
    name: 'Emerald Zen',
    tagline: 'Deep calming evergreen forest, bamboo jade, and vitality',
    category: 'advanced',
    mode: 'dark',
    isAnimated: false,
    animationType: 'none',
    accentBadge: 'Wellness',
    previewCardBg: '#0B1E19',
    colors: {
      background: '#041410',
      backgroundElement: '#0E2822',
      backgroundSelected: '#173D34',
      card: '#0B1E19',
      cardBorder: '#1A4339',
      text: '#ECFDF5',
      textSecondary: '#6EE7B7',
      primary: '#10B981',
      primaryForeground: '#041410',
      secondary: '#13352C',
      secondaryForeground: '#34D399',
      accent: '#059669',
      accentGlow: 'rgba(16, 185, 129, 0.35)',
      border: '#163B32',
      success: '#10B981',
      warning: '#FBBF24',
      danger: '#F87171',
      info: '#38BDF8',
      health: '#F87171',
      finance: '#10B981',
      productivity: '#34D399',
      growth: '#A7F3D0',
      gradient: ['#10B981', '#059669', '#064E3B'],
    },
  },
  {
    id: 'sunset-horizon',
    name: 'Sunset Horizon',
    tagline: 'Deep twilight violet and shifting radiant coral sunset waves',
    category: 'animated',
    mode: 'dark',
    isAnimated: true,
    animationType: 'aurora',
    accentBadge: 'Animated Aurora',
    previewCardBg: '#1B1429',
    colors: {
      background: '#120D1C',
      backgroundElement: '#221933',
      backgroundSelected: '#32254B',
      card: '#1B1429',
      cardBorder: '#392C54',
      text: '#FFF1F2',
      textSecondary: '#FDA4AF',
      primary: '#FB7185',
      primaryForeground: '#120D1C',
      secondary: '#361D32',
      secondaryForeground: '#FB7185',
      accent: '#F59E0B',
      accentGlow: 'rgba(251, 113, 133, 0.4)',
      border: '#2E2245',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F43F5E',
      info: '#38BDF8',
      health: '#FB7185',
      finance: '#34D399',
      productivity: '#F59E0B',
      growth: '#C084FC',
      gradient: ['#FB7185', '#F59E0B', '#7C3AED'],
    },
  },
  {
    id: 'obsidian-stealth',
    name: 'Obsidian Stealth',
    tagline: 'Pure AMOLED pitch black, sharp titanium borders, pure focus',
    category: 'simple',
    mode: 'dark',
    isAnimated: false,
    animationType: 'none',
    accentBadge: 'AMOLED Pure',
    previewCardBg: '#09090B',
    colors: {
      background: '#000000',
      backgroundElement: '#121215',
      backgroundSelected: '#202024',
      card: '#09090B',
      cardBorder: '#27272A',
      text: '#FAFAFA',
      textSecondary: '#A1A1AA',
      primary: '#FAFAFA',
      primaryForeground: '#000000',
      secondary: '#18181B',
      secondaryForeground: '#E4E4E7',
      accent: '#52525B',
      accentGlow: 'rgba(250, 250, 250, 0.2)',
      border: '#1F1F23',
      success: '#22C55E',
      warning: '#EAB308',
      danger: '#EF4444',
      info: '#06B6D4',
      health: '#EF4444',
      finance: '#22C55E',
      productivity: '#A1A1AA',
      growth: '#E4E4E7',
      gradient: ['#FAFAFA', '#A1A1AA', '#27272A'],
    },
  },
  {
    id: 'cosmic-nebula',
    name: 'Cosmic Nebula',
    tagline: 'Deep interstellar space with breathing starlight and nebula dust',
    category: 'animated',
    mode: 'dark',
    isAnimated: true,
    animationType: 'nebula',
    accentBadge: 'Animated Nebula',
    previewCardBg: '#0F1226',
    colors: {
      background: '#070914',
      backgroundElement: '#131833',
      backgroundSelected: '#1E254F',
      card: '#0F1226',
      cardBorder: '#232B59',
      text: '#F8FAFC',
      textSecondary: '#93C5FD',
      primary: '#818CF8',
      primaryForeground: '#070914',
      secondary: '#1C2247',
      secondaryForeground: '#818CF8',
      accent: '#38BDF8',
      accentGlow: 'rgba(129, 140, 248, 0.4)',
      border: '#1A2147',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F43F5E',
      info: '#38BDF8',
      health: '#F43F5E',
      finance: '#34D399',
      productivity: '#818CF8',
      growth: '#C084FC',
      gradient: ['#818CF8', '#38BDF8', '#C084FC'],
    },
  },
  {
    id: 'champagne-luxe',
    name: 'Champagne Luxe',
    tagline: 'Pearlescent warm silk, metallic rose-gold, and fine luxury gold',
    category: 'advanced',
    mode: 'light',
    isAnimated: false,
    animationType: 'none',
    accentBadge: 'Luxury',
    previewCardBg: '#FFFFFF',
    colors: {
      background: '#FCF8F5',
      backgroundElement: '#F5ECE6',
      backgroundSelected: '#EADECE',
      card: '#FFFFFF',
      cardBorder: '#E6D7CC',
      text: '#1C1917',
      textSecondary: '#78716C',
      primary: '#D97706',
      primaryForeground: '#FFFFFF',
      secondary: '#FEF3C7',
      secondaryForeground: '#92400E',
      accent: '#E11D48',
      accentGlow: 'rgba(217, 119, 6, 0.25)',
      border: '#EFE3DA',
      success: '#059669',
      warning: '#D97706',
      danger: '#BE123C',
      info: '#2563EB',
      health: '#E11D48',
      finance: '#059669',
      productivity: '#D97706',
      growth: '#9333EA',
      gradient: ['#D97706', '#F59E0B', '#E11D48'],
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'classic-light';

export function getThemeById(id: string): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
