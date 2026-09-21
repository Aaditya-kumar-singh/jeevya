import React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, BedDouble, Dumbbell, Flame, Moon, Sun, Target, Trophy, Zap } from 'lucide-react-native';

import { Text, Heading, Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

const fighterImage = require('../../../assets/images/testosterone-forge.jpg');

const trainingCards = [
  { title: 'Strength training', body: 'Progressive resistance training is the foundation of this section.', icon: Dumbbell },
  { title: 'Sleep 7–9h', body: 'Consistent, quality sleep supports recovery and healthy hormone regulation.', icon: BedDouble },
  { title: 'Morning light', body: 'Get regular outdoor light and keep a consistent sleep-wake rhythm.', icon: Sun },
  { title: 'Fuel recovery', body: 'Eat enough protein, energy, and micronutrient-rich foods for your training load.', icon: Flame },
];

const workoutPresets = [
  { title: 'Upper Body Strength', meta: 'Chest · Shoulders · Triceps', duration: '45 min' },
  { title: 'Lower Body Power', meta: 'Quads · Hamstrings · Glutes', duration: '50 min' },
  { title: 'Full Body', meta: 'Strength · Conditioning · Core', duration: '40 min' },
  { title: 'HIIT Conditioning', meta: 'Intervals · Cardio · Athletic work', duration: '25 min' },
];

export default function GymScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View className="flex-1" style={{ backgroundColor: c.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="px-5" style={{ paddingTop: 56 }}>
          <View className="flex-row items-center justify-between mb-5">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }}
              accessibilityRole="button"
              accessibilityLabel="Back">
              <ArrowLeft size={20} color={c.text} />
            </Pressable>
            <View className="items-end">
              <Text size="xs" className="font-bold tracking-widest" style={{ color: c.primary }}>
                JEEVYA GYM
              </Text>
              <Text size="xs" style={{ color: c.textSecondary }}>STRONGER EVERY DAY</Text>
            </View>
          </View>

          <Card className="overflow-hidden rounded-[28px] border-0 p-0" style={{ backgroundColor: '#090909' }}>
            <View className="relative h-[310px]">
              <Image
                source={fighterImage}
                className="absolute inset-0 h-full w-full"
                resizeMode="cover"
                accessibilityLabel="Black and white fighter training portrait"
              />
              <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.46)' }} />
              <View className="absolute left-5 right-5 bottom-5">
                <Text size="xs" className="font-bold tracking-[3px]" style={{ color: '#FCA5A5' }}>
                  TRAIN · FOCUS · GROW
                </Text>
                <Heading size="3xl" className="mt-1 font-black italic" style={{ color: '#EF2B2D' }}>
                  TESTOSTERONE
                </Heading>
                <Heading size="2xl" className="font-black" style={{ color: '#FFFFFF' }}>
                  IS A MINDSET
                </Heading>
                <Text size="sm" className="mt-2 max-w-[300px] leading-5" style={{ color: '#E5E5E5' }}>
                  Build the habits that support strength, recovery, confidence, and consistency.
                </Text>
                <View className="mt-4 self-start rounded-xl px-4 py-2" style={{ backgroundColor: '#EF2B2D' }}>
                  <Text size="xs" className="font-black tracking-widest" style={{ color: '#FFFFFF' }}>
                    DISCIPLINE FIRST
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          <View className="mt-4 flex-row gap-3">
            {[
              { value: '0', label: 'Workout streak', icon: Flame },
              { value: '0', label: 'Completed', icon: Trophy },
              { value: '0', label: 'PRs tracked', icon: Target },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <View key={item.label} className="flex-1 rounded-2xl p-3" style={{ backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }}>
                  <Icon size={17} color={c.primary} />
                  <Text size="lg" className="mt-2 font-extrabold" style={{ color: c.text }}>{item.value}</Text>
                  <Text size="xs" style={{ color: c.textSecondary }}>{item.label}</Text>
                </View>
              );
            })}
          </View>

          <View className="mt-7 flex-row items-center justify-between">
            <View>
              <Heading size="lg" className="font-extrabold" style={{ color: c.text }}>Today&apos;s training</Heading>
              <Text size="xs" className="mt-1" style={{ color: c.textSecondary }}>Choose a session and start building momentum.</Text>
            </View>
            <Zap size={20} color={c.primary} />
          </View>

          <Pressable
            onPress={() => router.push('/health/workout-builder')}
            className="mt-4 rounded-3xl p-4"
            style={{ backgroundColor: c.primary }}
            accessibilityRole="button"
            accessibilityLabel="Build a workout">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text size="xs" className="font-bold" style={{ color: '#FECACA' }}>START STRONG</Text>
                <Heading size="lg" className="mt-1 font-extrabold" style={{ color: '#FFFFFF' }}>Build your workout</Heading>
                <Text size="xs" className="mt-1" style={{ color: '#FEE2E2' }}>Pick exercises from your library and track every set.</Text>
              </View>
              <Dumbbell size={28} color="#FFFFFF" />
            </View>
          </Pressable>

          <View className="mt-7">
            <Heading size="lg" className="font-extrabold" style={{ color: c.text }}>Testosterone support</Heading>
            <Text size="xs" className="mt-1 leading-5" style={{ color: c.textSecondary }}>
              Testosterone is a hormone, not a score. Jeevya focuses on the everyday behaviours that support healthy hormone function and training recovery.
            </Text>
          </View>

          <View className="mt-4 gap-3">
            {trainingCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="rounded-3xl p-4" style={{ backgroundColor: c.card, borderColor: c.border }}>
                  <View className="flex-row items-center">
                    <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: c.secondary }}>
                      <Icon size={20} color={c.primary} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text size="sm" className="font-bold" style={{ color: c.text }}>{item.title}</Text>
                      <Text size="xs" className="mt-1 leading-5" style={{ color: c.textSecondary }}>{item.body}</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>

          <View className="mt-7 flex-row items-center gap-2">
            <Dumbbell size={20} color={c.primary} />
            <Heading size="lg" className="font-extrabold" style={{ color: c.text }}>Workout presets</Heading>
          </View>

          <View className="mt-4 gap-3">
            {workoutPresets.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => router.push('/health/workout-builder')}
                className="rounded-3xl p-4"
                style={{ backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text size="sm" className="font-bold" style={{ color: c.text }}>{item.title}</Text>
                    <Text size="xs" className="mt-1" style={{ color: c.textSecondary }}>{item.meta}</Text>
                  </View>
                  <View className="items-end">
                    <Text size="xs" className="font-bold" style={{ color: c.primary }}>{item.duration}</Text>
                    <Text size="xs" className="mt-1" style={{ color: c.textSecondary }}>Build</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          <View className="mt-6 flex-row items-center rounded-3xl p-4" style={{ backgroundColor: c.backgroundElement, borderColor: c.border, borderWidth: 1 }}>
            <Moon size={19} color={c.primary} />
            <Text size="xs" className="ml-3 flex-1 leading-5" style={{ color: c.textSecondary }}>
              If you are concerned about low testosterone or symptoms, use proper clinical testing and discuss the result with a qualified clinician rather than self-treating.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
