import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Heading, Text, Card } from '@/components/ui';
import { Lightbulb, RefreshCw, Sparkles } from 'lucide-react-native';

const INSIGHTS = [
  {
    quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle",
    tag: "Mindset",
  },
  {
    quote: "You do not rise to the level of your goals. You fall to the level of your systems.",
    author: "James Clear",
    tag: "Atomic Habits",
  },
  {
    quote: "Small daily improvements over time lead to stunning results.",
    author: "Robin Sharma",
    tag: "Consistency",
  },
  {
    quote: "Focus is a muscle. The more you protect your attention, the stronger it grows.",
    author: "LifeOS Focus AI",
    tag: "Deep Work",
  },
];

export function FocusInsightCard() {
  const [index, setIndex] = useState(0);
  const current = INSIGHTS[index];

  const nextInsight = () => {
    setIndex((prev) => (prev + 1) % INSIGHTS.length);
  };

  return (
    <Card className="w-full p-5 border border-purple-500/25 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 shadow-xs rounded-3xl relative overflow-hidden">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20">
            <Lightbulb size={18} className="text-purple-600 dark:text-purple-400" />
          </View>
          <Text size="xs" className="font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Daily Focus Insight • {current.tag}
          </Text>
        </View>

        <Pressable
          onPress={nextInsight}
          className="h-8 w-8 items-center justify-center rounded-full bg-muted/60 active:opacity-80"
          accessibilityLabel="Next insight"
        >
          <RefreshCw size={14} className="text-muted-foreground" />
        </Pressable>
      </View>

      <Text size="sm" className="mt-3 font-semibold italic text-foreground leading-relaxed">
        &quot;{current.quote}&quot;
      </Text>

      <View className="mt-2 flex-row items-center justify-between">
        <Text size="xs" className="font-bold text-muted-foreground">
          — {current.author}
        </Text>
        <View className="flex-row items-center gap-1">
          <Sparkles size={12} className="text-amber-400" fill="#FBBF24" />
          <Text size="xs" className="font-bold text-amber-500">
            +50 Focus Score
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default FocusInsightCard;
