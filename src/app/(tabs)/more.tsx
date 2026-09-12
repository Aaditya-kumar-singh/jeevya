import { Pressable, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { BookOpen, ChevronRight, NotebookPen, Settings, ListChecks, CheckSquare } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { FadeInView } from '@/components/motion/FadeInView';
import { ScalePressable } from '@/components/motion/ScalePressable';

const links = [
  { label: 'Tasks', value: 'Stay organized daily', href: '/tasks', icon: CheckSquare, iconBg: 'bg-violet-500/15 text-violet-500' },
  { label: 'Habits', value: 'Build better routines', href: '/habits', icon: ListChecks, iconBg: 'bg-indigo-500/15 text-indigo-500' },
  { label: 'Books', value: 'Reading list + progress', href: '/books', icon: BookOpen, iconBg: 'bg-amber-500/15 text-amber-500' },
  { label: 'Journal', value: 'Reflect daily', href: '/journal', icon: NotebookPen, iconBg: 'bg-emerald-500/15 text-emerald-500' },
  { label: 'Settings', value: 'Profile + app prefs', href: '/settings', icon: Settings, iconBg: 'bg-sky-500/15 text-sky-500' },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-12" style={{ paddingTop: topPadding }}>
        <FadeInView delay={0}>
          <View>
            <Text size="xs" className="font-semibold text-amber-500 uppercase tracking-wider">
              LifeOS Core
            </Text>
            <Heading size="xl" className="mt-1 font-bold tracking-tight text-foreground">
              More Tools
            </Heading>
            <Text size="sm" className="mt-1 text-muted-foreground font-medium">
              Growth, reflection, and settings
            </Text>
          </View>
        </FadeInView>

        <View className="gap-3">
          {links.map((link, index) => {
            const Icon = link.icon;
            return (
              <FadeInView key={link.label} delay={100 + index * 60}>
                <Link href={link.href as any} asChild>
                  <ScalePressable>
                    <Card className="w-full p-4 border border-border/50 shadow-xs">
                      <View className="flex-row items-center gap-3.5">
                        <View className={`h-11 w-11 items-center justify-center rounded-2xl ${link.iconBg}`}>
                          <Icon size={20} />
                        </View>
                        <View className="flex-1">
                          <Heading size="sm" className="font-bold">{link.label}</Heading>
                          <Text size="xs" className="text-muted-foreground font-medium mt-0.5">
                            {link.value}
                          </Text>
                        </View>
                        <ChevronRight size={18} className="text-muted-foreground/60" />
                      </View>
                    </Card>
                  </ScalePressable>
                </Link>
              </FadeInView>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
