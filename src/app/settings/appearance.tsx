import React, { useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Check,
  Sparkles,
  Sun,
  Moon,
  Palette,
  Zap,
  Activity,
  Flame,
  Award,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Heading, Text, Badge, BadgeText } from '@/components/ui';
import { FadeInView } from '@/components/motion/FadeInView';
import { ScalePressable } from '@/components/motion/ScalePressable';
import { AnimatedThemeBackground } from '@/components/visuals/AnimatedThemeBackground';
import { THEMES, ThemeCategory, ThemeDefinition, ThemeId } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FilterTab = 'all' | ThemeCategory;

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);
  const { themeId, setTheme, theme: activeTheme } = useTheme();

  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('all');
  const [previewThemeId, setPreviewThemeId] = useState<ThemeId>(themeId);

  const previewTheme = THEMES.find((t) => t.id === previewThemeId) ?? activeTheme;

  const filteredThemes = THEMES.filter((t) => {
    if (selectedFilter === 'all') return true;
    return t.category === selectedFilter;
  });

  const categories: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: THEMES.length },
    { key: 'animated', label: 'Animated', count: THEMES.filter((t) => t.isAnimated).length },
    { key: 'simple', label: 'Simple', count: THEMES.filter((t) => t.category === 'simple').length },
    { key: 'advanced', label: 'Advanced', count: THEMES.filter((t) => t.category === 'advanced').length },
    { key: 'classic', label: 'Classic', count: THEMES.filter((t) => t.category === 'classic').length },
  ];

  const handleSelectTheme = (id: ThemeId) => {
    setPreviewThemeId(id);
    void setTheme(id);
  };

  return (
    <View className="flex-1 bg-background relative">
      {/* Background Ambience */}
      <AnimatedThemeBackground width={450} height={400} themeOverride={previewTheme} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-16 gap-5" style={{ paddingTop: topPadding }}>
          {/* Header */}
          <FadeInView delay={0}>
            <View className="flex-row items-center justify-between">
              <ScalePressable
                onPress={() => router.back()}
                className="h-10 w-10 items-center justify-center rounded-2xl bg-card border border-border/80 shadow-xs">
                <ArrowLeft size={20} className="text-foreground" />
              </ScalePressable>

              <View className="flex-row items-center gap-2">
                <Badge variant="outline" className="border-primary/40 bg-primary/10 px-3 py-1 rounded-full">
                  <Palette size={12} className="text-primary mr-1" />
                  <BadgeText className="text-primary font-bold text-xs">{THEMES.length} Themes</BadgeText>
                </Badge>
              </View>
            </View>

            <View className="mt-4">
              <Text size="xs" className="font-bold text-primary uppercase tracking-wider">
                Aesthetics & Customization
              </Text>
              <Heading size="2xl" className="mt-1 font-extrabold text-foreground tracking-tight">
                Theme Studio
              </Heading>
              <Text size="sm" className="mt-1 text-muted-foreground font-medium">
                Choose from minimal, futuristic, luxury, or live animated themes
              </Text>
            </View>
          </FadeInView>

          {/* Live Interactive Preview Card */}
          <FadeInView delay={60}>
            <Card
              className="w-full p-4 rounded-3xl border border-border/80 shadow-sm relative overflow-hidden"
              style={{ backgroundColor: previewTheme.colors.card }}>
              {/* Subtle card glow overlay */}
              <View
                style={{
                  position: 'absolute',
                  top: -60,
                  right: -60,
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  backgroundColor: previewTheme.colors.accentGlow,
                }}
              />

              <View className="flex-row items-center justify-between pb-3 border-b border-border/40">
                <View className="flex-row items-center gap-2.5">
                  <View
                    className="h-8 w-8 rounded-xl items-center justify-center"
                    style={{ backgroundColor: previewTheme.colors.primary }}>
                    <Sparkles size={16} color={previewTheme.colors.primaryForeground} />
                  </View>
                  <View>
                    <Text size="xs" className="font-bold" style={{ color: previewTheme.colors.text }}>
                      {previewTheme.name}
                    </Text>
                    <Text size="xs" style={{ color: previewTheme.colors.textSecondary }}>
                      {previewTheme.tagline}
                    </Text>
                  </View>
                </View>

                {previewTheme.isAnimated ? (
                  <View
                    className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: previewTheme.colors.secondary }}>
                    <Zap size={12} color={previewTheme.colors.secondaryForeground} />
                    <Text
                      size="xs"
                      className="font-bold"
                      style={{ color: previewTheme.colors.secondaryForeground }}>
                      Live Animated
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Sample Dashboard Snippets */}
              <View className="mt-3.5 gap-2.5">
                <View className="flex-row gap-2.5">
                  {/* Streak Card */}
                  <View
                    className="flex-1 p-3 rounded-2xl border"
                    style={{
                      backgroundColor: previewTheme.colors.backgroundElement,
                      borderColor: previewTheme.colors.border,
                    }}>
                    <View className="flex-row items-center justify-between">
                      <Flame size={16} color={previewTheme.colors.primary} />
                      <Text size="xs" className="font-extrabold" style={{ color: previewTheme.colors.primary }}>
                        14d
                      </Text>
                    </View>
                    <Text size="xs" className="mt-1 font-semibold" style={{ color: previewTheme.colors.text }}>
                      Habit Streak
                    </Text>
                  </View>

                  {/* Daily Pulse */}
                  <View
                    className="flex-1 p-3 rounded-2xl border"
                    style={{
                      backgroundColor: previewTheme.colors.backgroundElement,
                      borderColor: previewTheme.colors.border,
                    }}>
                    <View className="flex-row items-center justify-between">
                      <Activity size={16} color={previewTheme.colors.success} />
                      <Text size="xs" className="font-extrabold" style={{ color: previewTheme.colors.success }}>
                        94%
                      </Text>
                    </View>
                    <Text size="xs" className="mt-1 font-semibold" style={{ color: previewTheme.colors.text }}>
                      Daily Pulse
                    </Text>
                  </View>

                  {/* XP Level */}
                  <View
                    className="flex-1 p-3 rounded-2xl border"
                    style={{
                      backgroundColor: previewTheme.colors.backgroundElement,
                      borderColor: previewTheme.colors.border,
                    }}>
                    <View className="flex-row items-center justify-between">
                      <Award size={16} color={previewTheme.colors.accent} />
                      <Text size="xs" className="font-extrabold" style={{ color: previewTheme.colors.accent }}>
                        Lv 8
                      </Text>
                    </View>
                    <Text size="xs" className="mt-1 font-semibold" style={{ color: previewTheme.colors.text }}>
                      Growth XP
                    </Text>
                  </View>
                </View>

                {/* Simulated Action Button */}
                <ScalePressable
                  onPress={() => handleSelectTheme(previewTheme.id)}
                  className="w-full py-2.5 rounded-2xl items-center justify-center flex-row gap-2 mt-1 shadow-xs"
                  style={{ backgroundColor: previewTheme.colors.primary }}>
                  {themeId === previewTheme.id ? (
                    <>
                      <Check size={16} color={previewTheme.colors.primaryForeground} />
                      <Text
                        size="xs"
                        className="font-bold"
                        style={{ color: previewTheme.colors.primaryForeground }}>
                        Active Theme Applied
                      </Text>
                    </>
                  ) : (
                    <Text
                      size="xs"
                      className="font-bold"
                      style={{ color: previewTheme.colors.primaryForeground }}>
                      Apply {previewTheme.name}
                    </Text>
                  )}
                </ScalePressable>
              </View>
            </Card>
          </FadeInView>

          {/* Category Filter Chips */}
          <FadeInView delay={100}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2 -mx-1 px-1">
              {categories.map((cat) => {
                const isActive = selectedFilter === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => setSelectedFilter(cat.key)}
                    className={`px-3.5 py-1.5 rounded-full border mr-2 flex-row items-center gap-1.5 ${
                      isActive
                        ? 'bg-primary border-primary'
                        : 'bg-card border-border/80'
                    }`}>
                    <Text
                      size="xs"
                      className={`font-semibold ${
                        isActive ? 'text-primary-foreground font-bold' : 'text-foreground'
                      }`}>
                      {cat.label}
                    </Text>
                    <View
                      className={`h-4 min-w-4 px-1 rounded-full items-center justify-center ${
                        isActive ? 'bg-white/25' : 'bg-muted'
                      }`}>
                      <Text
                        size="xs"
                        className={`text-[10px] font-bold ${
                          isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                        }`}>
                        {cat.count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </FadeInView>

          {/* Theme Grid / List */}
          <View className="gap-3">
            {filteredThemes.map((item, idx) => {
              const isCurrent = themeId === item.id;
              const isHighlighted = previewThemeId === item.id;

              return (
                <FadeInView key={item.id} delay={120 + idx * 35}>
                  <ScalePressable
                    onPress={() => {
                      setPreviewThemeId(item.id);
                      void setTheme(item.id);
                    }}>
                    <Card
                      className={`p-4 rounded-3xl border transition-all ${
                        isCurrent
                          ? 'border-primary ring-2 ring-primary/40 shadow-sm'
                          : isHighlighted
                            ? 'border-primary/60'
                            : 'border-border/70'
                      }`}
                      style={{ backgroundColor: item.colors.card }}>
                      <View className="flex-row items-center justify-between">
                        {/* Theme Info */}
                        <View className="flex-1 mr-3">
                          <View className="flex-row items-center gap-2 flex-wrap">
                            <Heading size="sm" className="font-bold" style={{ color: item.colors.text }}>
                              {item.name}
                            </Heading>

                            {/* Mode badge */}
                            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60">
                              {item.mode === 'dark' ? (
                                <Moon size={10} color={item.colors.textSecondary} />
                              ) : (
                                <Sun size={10} color={item.colors.textSecondary} />
                              )}
                              <Text
                                size="xs"
                                className="text-[10px] font-medium"
                                style={{ color: item.colors.textSecondary }}>
                                {item.mode === 'dark' ? 'Dark' : 'Light'}
                              </Text>
                            </View>

                            {/* Animation Badge */}
                            {item.isAnimated ? (
                              <View
                                className="flex-row items-center gap-1 px-2 py-0.5 rounded-md"
                                style={{ backgroundColor: item.colors.secondary }}>
                                <Zap size={10} color={item.colors.secondaryForeground} />
                                <Text
                                  size="xs"
                                  className="text-[10px] font-bold"
                                  style={{ color: item.colors.secondaryForeground }}>
                                  Animated
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <Text
                            size="xs"
                            className="font-medium mt-1 leading-relaxed"
                            style={{ color: item.colors.textSecondary }}>
                            {item.tagline}
                          </Text>
                        </View>

                        {/* Active / Selection Checkmark */}
                        <View
                          className={`h-9 w-9 rounded-2xl items-center justify-center border ${
                            isCurrent
                              ? 'border-primary'
                              : 'border-border/60 bg-background/50'
                          }`}
                          style={{
                            backgroundColor: isCurrent ? item.colors.primary : undefined,
                          }}>
                          {isCurrent ? (
                            <Check size={18} color={item.colors.primaryForeground} />
                          ) : (
                            <View
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.colors.border }}
                            />
                          )}
                        </View>
                      </View>

                      {/* Palette Color Swatches */}
                      <View className="flex-row items-center justify-between mt-3.5 pt-3 border-t border-border/40">
                        <View className="flex-row items-center gap-2">
                          <Text size="xs" className="font-semibold text-[11px]" style={{ color: item.colors.textSecondary }}>
                            Palette:
                          </Text>
                          <View className="flex-row items-center gap-1.5">
                            {/* Primary */}
                            <View
                              className="h-5 w-5 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: item.colors.primary }}
                            />
                            {/* Accent */}
                            <View
                              className="h-5 w-5 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: item.colors.accent }}
                            />
                            {/* Card Surface */}
                            <View
                              className="h-5 w-5 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: item.colors.card }}
                            />
                            {/* Background */}
                            <View
                              className="h-5 w-5 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: item.colors.background }}
                            />
                          </View>
                        </View>

                        <Text
                          size="xs"
                          className="font-bold text-[11px]"
                          style={{ color: isCurrent ? item.colors.primary : item.colors.textSecondary }}>
                          {isCurrent ? 'Active Now' : 'Tap to Apply'}
                        </Text>
                      </View>
                    </Card>
                  </ScalePressable>
                </FadeInView>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
