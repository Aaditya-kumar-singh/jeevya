import { Alert, ScrollView, View } from 'react-native';
import { Link, router } from 'expo-router';
import { BarChart3, Brain, BookOpen, ChevronRight, ClipboardCheck, NotebookPen, Settings, ListChecks, CheckSquare, Layers, Search, Target, ShieldCheck, Download, Upload, Clock3 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { FadeInView } from '@/components/motion/FadeInView';
import { ScalePressable } from '@/components/motion/ScalePressable';
import { UserProfileHeader } from '@/components/more/UserProfileHeader';
import { MoreSystemGraphic } from '@/components/visuals/MoreSystemGraphic';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { useBackup } from '@/hooks/useBackup';

const links = [
  { label: 'Tasks & Action Items', value: 'Stay organized daily with high-priority actions', href: '/tasks', icon: CheckSquare, iconBg: 'bg-violet-500/15 text-violet-500', badge: '12 Due' },
  { label: 'Habit Routines', value: 'Build long-term streak habits & routines', href: '/habits', icon: ListChecks, iconBg: 'bg-indigo-500/15 text-indigo-500', badge: '7d Streak' },
  { label: 'Reading Library', value: 'Book list, goals & reading analytics', href: '/books', icon: BookOpen, iconBg: 'bg-amber-500/15 text-amber-500', badge: '3 Active' },
  { label: 'Goals & Progress', value: 'One view across your Jeevya goals', href: '/goals', icon: Target, iconBg: 'bg-rose-500/15 text-rose-500', badge: 'Unified' },
  { label: 'Life Intelligence', value: 'Deterministic signals across your Jeevya data', href: '/insights', icon: Brain, iconBg: 'bg-fuchsia-500/15 text-fuchsia-500', badge: 'Signals' },
  { label: 'Search Everything', value: 'Find records across your Jeevya modules', href: '/search', icon: Search, iconBg: 'bg-cyan-500/15 text-cyan-500', badge: 'Global' },
  { label: 'Jeevya Analytics', value: 'Cross-module activity and progress overview', href: '/analytics', icon: BarChart3, iconBg: 'bg-sky-500/15 text-sky-500', badge: '7d' },
  { label: 'Data Quality', value: 'Check cross-module data integrity and diagnostics', href: '/data-quality', icon: ShieldCheck, iconBg: 'bg-emerald-500/15 text-emerald-500', badge: 'Diagnostics' },
  { label: 'Life Timeline', value: 'Review historical activity across your Jeevya domains', href: '/life-timeline', icon: Clock3, iconBg: 'bg-sky-500/15 text-sky-500', badge: 'History' },
  { label: 'Weekly Review', value: 'Review patterns, wins, and areas needing attention', href: '/weekly-review', icon: ClipboardCheck, iconBg: 'bg-emerald-500/15 text-emerald-500', badge: 'Weekly' },
  { label: 'Daily Reflection Journal', value: 'Reflect daily with mood logs', href: '/journal', icon: NotebookPen, iconBg: 'bg-emerald-500/15 text-emerald-500', badge: 'Today' },
  { label: 'Settings & Preferences', value: 'Profile, theme, & data preferences', href: '/settings', icon: Settings, iconBg: 'bg-sky-500/15 text-sky-500', badge: 'Jeevya v2.4' },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);
  const { busy, message, error, exportUserBackup, importUserBackup } = useBackup();

  const handleRestore = () => {
    Alert.alert(
      'Restore Jeevya Backup',
      'Restoring replaces all supported local Jeevya data with the backup. Continue only if the backup is trusted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: async () => {
          const restored = await importUserBackup();
          if (restored) router.replace('/(tabs)');
        } },
      ],
    );
  };

  return (
    <View className="flex-1 bg-amber-50/40 dark:bg-slate-950 relative">
      {/* Ambient background floating SVG blobs */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <FloatingBlobsSVG color1="#F59E0B" color2="#8B5CF6" width={450} height={350} />
      </View>

      <ScrollView className="flex-1">
        <View className="gap-4 px-5 pb-12" style={{ zIndex: 1, paddingTop: topPadding }}>
          <FadeInView delay={0}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text size="xs" className="font-semibold text-amber-500 uppercase tracking-wider">
                  Jeevya Core Engine
                </Text>
                <Heading size="xl" className="mt-1 font-bold tracking-tight text-foreground">
                  System Tools & Growth
                </Heading>
                <Text size="sm" className="mt-1 text-muted-foreground font-medium">
                  Growth, reflection, and system controls
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/20 shadow-xs">
                <Layers size={24} className="text-amber-500" />
              </View>
            </View>
          </FadeInView>

          {/* Intricate SVG Graphic Illustration */}
          <FadeInView delay={40}>
            <View className="items-center my-1">
              <MoreSystemGraphic width={360} height={130} />
            </View>
          </FadeInView>

          <FadeInView delay={60}>
            <UserProfileHeader />
          </FadeInView>

          <View className="gap-3">
            {links.map((link, index) => {
              const Icon = link.icon;
              return (
                <FadeInView key={link.label} delay={120 + index * 50}>
                  <Link href={link.href as any} asChild>
                    <ScalePressable>
                      <Card className="w-full p-4 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl backdrop-blur-md">
                        <View className="flex-row items-center gap-3.5">
                          <View className={`h-12 w-12 items-center justify-center rounded-2xl ${link.iconBg}`}>
                            <Icon size={22} />
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center justify-between">
                              <Heading size="sm" className="font-bold">{link.label}</Heading>
                              <View className="rounded-full bg-accent/60 px-2 py-0.5 border border-border/40">
                                <Text size="xs" className="font-semibold text-muted-foreground">
                                  {link.badge}
                                </Text>
                              </View>
                            </View>
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

          <FadeInView delay={680}>
            <View className="gap-3">
              <ScalePressable disabled={busy} onPress={() => void exportUserBackup()}>
                <Card className="w-full p-4 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl backdrop-blur-md">
                  <View className="flex-row items-center gap-3.5">
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15">
                      <Download size={22} className="text-emerald-500" />
                    </View>
                    <View className="flex-1">
                      <Heading size="sm" className="font-bold">Export Backup</Heading>
                      <Text size="xs" className="text-muted-foreground font-medium mt-0.5">Create a portable copy of supported Jeevya data</Text>
                    </View>
                    <ChevronRight size={18} className="text-muted-foreground/60" />
                  </View>
                </Card>
              </ScalePressable>

              <ScalePressable disabled={busy} onPress={handleRestore}>
                <Card className="w-full p-4 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl backdrop-blur-md">
                  <View className="flex-row items-center gap-3.5">
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15">
                      <Upload size={22} className="text-sky-500" />
                    </View>
                    <View className="flex-1">
                      <Heading size="sm" className="font-bold">Restore Backup</Heading>
                      <Text size="xs" className="text-muted-foreground font-medium mt-0.5">Validate and replace supported local Jeevya data</Text>
                    </View>
                    <ChevronRight size={18} className="text-muted-foreground/60" />
                  </View>
                </Card>
              </ScalePressable>

              {message ? <Text size="xs" className="text-emerald-600 font-semibold px-1">{message}</Text> : null}
              {error ? <Text size="xs" className="text-destructive font-semibold px-1">{error}</Text> : null}
            </View>
          </FadeInView>
        </View>
      </ScrollView>
    </View>
  );
}

