import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Bell, ChevronRight, Palette, User, Database, Settings as SettingsIcon, ShieldCheck, RefreshCw, Sparkles, SlidersHorizontal } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ButtonText, Card, Heading, Text } from '@/components/ui';
import { FadeInView } from '@/components/motion/FadeInView';
import { ScalePressable } from '@/components/motion/ScalePressable';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { settingsSections } from '@/lib/mockData';
import { useSync } from '@/hooks/useSync';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useAccountGate } from '@/hooks/useAccountGate';
import { AccountGate } from '@/components/account/AccountGate';
import { useTheme } from '@/hooks/use-theme';

const icons: Record<string, typeof User> = {
  profile: User,
  appearance: Palette,
  notifications: Bell,
  data: Database,
  widgets: SlidersHorizontal,
};

const iconBgs: Record<string, string> = {
  profile: 'bg-indigo-500/15 text-indigo-500',
  appearance: 'bg-purple-500/15 text-purple-500',
  notifications: 'bg-rose-500/15 text-rose-500',
  data: 'bg-emerald-500/15 text-emerald-500',
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);
  const { status, conflicts, sync, resolveKeepLocal, resolveKeepRemote } = useSync();
  const { authState, user, signOut } = useAuth();
  const { checkAccess } = useCapabilities();
  const { gate, attempt, dismiss, signIn, createAccount } = useAccountGate();
  const { theme } = useTheme();
  const accountSettingsAccess = checkAccess('accountSettings');
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const openProfile = () => {
    if (accountSettingsAccess.allowed && authState === 'authenticated') return;
    attempt(
      'accountSettings',
      () => signIn('/settings'),
      {
        title: 'Account required',
        explanation: 'Create a free Jeevya account to manage your account settings.',
      },
    );
  };

  const handleSignOut = async () => {
    setSignOutBusy(true);
    setAccountError(null);
    const result = await signOut();
    setSignOutBusy(false);
    if (result.authError) setAccountError(result.authError);
  };

  const startSync = () => {
    attempt(
      'cloudSync',
      () => { void sync(); },
      {
        title: 'Account required',
        explanation: 'Create a free Jeevya account to synchronize your Jeevya data across your account.',
      },
    );
  };

  return (
    <View className="flex-1 bg-sky-50/40 dark:bg-slate-950 relative">
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <FloatingBlobsSVG color1="#38BDF8" color2="#6366F1" width={450} height={350} />
      </View>

      <ScrollView className="flex-1">
        <View className="gap-4 px-5 pb-12" style={{ zIndex: 1, paddingTop: topPadding }}>
          <FadeInView delay={0}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text size="xs" className="font-semibold text-sky-500 uppercase tracking-wider">
                  Jeevya System Control
                </Text>
                <Heading size="xl" className="mt-1 font-bold tracking-tight text-foreground">
                  Preferences & Data
                </Heading>
                <Text size="sm" className="mt-1 text-muted-foreground font-medium">
                  Manage account, notifications, and dark mode
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/20 shadow-xs">
                <SettingsIcon size={24} className="text-sky-500" />
              </View>
            </View>
          </FadeInView>

          <View className="gap-3 mt-2">
            {settingsSections.map((section, index) => {
              const Icon = icons[section.id] ?? User;
              const bgStyle = iconBgs[section.id] ?? 'bg-sky-500/15 text-sky-500';
              const isProfile = section.id === 'profile';
              const isAppearance = section.id === 'appearance';
              const onPress = isProfile && authState !== 'authenticated'
                ? openProfile
                : isAppearance
                  ? () => router.push('/settings/appearance' as never)
                  : undefined;
              const subtitleText = isProfile && authState === 'authenticated'
                ? user?.email ?? 'Authenticated account'
                : isProfile
                  ? 'Sign in or create an account'
                  : isAppearance
                    ? `${theme.name} • ${theme.isAnimated ? 'Live Animated' : theme.mode === 'dark' ? 'Dark' : 'Light'} (10 Themes)`
                    : section.subtitle;
              return (
                <FadeInView key={section.id} delay={60 + index * 50}>
                  <ScalePressable onPress={onPress}>
                    <Card className="w-full p-4 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl backdrop-blur-md">
                      <View className="flex-row items-center gap-3.5">
                        <View className={`h-11 w-11 items-center justify-center rounded-2xl ${bgStyle}`}>
                          <Icon size={20} />
                        </View>
                        <View className="flex-1">
                          <Heading size="sm" className="font-bold">{section.title}</Heading>
                          <Text size="xs" className="text-muted-foreground font-medium mt-0.5">
                            {subtitleText}
                          </Text>
                        </View>
                        {isProfile && authState === 'authenticated' ? null : <ChevronRight size={18} className="text-muted-foreground/60" />}
                      </View>

                      {isProfile && authState === 'authenticated' && accountSettingsAccess.allowed ? (
                        <View className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-3 gap-2.5">
                          <View className="flex-row items-center justify-between gap-3">
                            <View className="flex-1">
                              <Text size="xs" className="font-semibold text-muted-foreground">Account status</Text>
                              <Text size="sm" className="mt-0.5 font-semibold">Authenticated</Text>
                            </View>
                            <ShieldCheck size={19} className="text-emerald-500" />
                          </View>
                          <Text size="xs" className="text-muted-foreground">
                            {user?.email ?? 'Authenticated account'}
                          </Text>
                          <Button variant="outline" onPress={() => void handleSignOut()} disabled={signOutBusy}>
                            <ButtonText>{signOutBusy ? 'Signing out...' : 'Sign out'}</ButtonText>
                          </Button>
                          {accountError ? <Text size="xs" className="font-semibold text-destructive">{accountError}</Text> : null}
                        </View>
                      ) : null}
                    </Card>
                  </ScalePressable>
                </FadeInView>
              );
            })}
          </View>

          <FadeInView delay={240}>
            <ScalePressable onPress={() => router.push('/settings/widgets' as never)}>
              <Card className="w-full p-4 border border-indigo-500/20 bg-indigo-500/5 rounded-3xl">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15">
                    <SlidersHorizontal size={20} className="text-indigo-500" />
                  </View>
                  <View className="flex-1">
                    <Heading size="sm" className="font-bold">Home-screen Widgets</Heading>
                    <Text size="xs" className="text-muted-foreground font-medium mt-0.5">Add any Jeevya module, reorder blocks, choose size, layout, density, and theme.</Text>
                  </View>
                  <ChevronRight size={18} className="text-muted-foreground/60" />
                </View>
              </Card>
            </ScalePressable>
          </FadeInView>

          <FadeInView delay={260}>
            <Card className="w-full p-4 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15">
                  <RefreshCw size={20} className="text-sky-500" />
                </View>
                <View className="flex-1">
                  <Heading size="sm" className="font-bold">Local Sync</Heading>
                  <Text size="xs" className="text-muted-foreground font-medium mt-0.5">
                    {status.message}
                  </Text>
                </View>
                <ScalePressable onPress={startSync} disabled={status.state === 'syncing'}>
                  {status.state === 'syncing' ? (
                    <ActivityIndicator />
                  ) : (
                    <Text size="xs" className="font-bold text-sky-500">Sync</Text>
                  )}
                </ScalePressable>
              </View>
              {conflicts.length > 0 ? (
                <View className="mt-3 gap-2">
                  <Text size="xs" className="font-bold text-amber-600 dark:text-amber-400">
                    {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'} pending review
                  </Text>
                  {conflicts.map((conflict) => (
                    <View key={conflict.conflictId} className="rounded-2xl border border-border/60 bg-background/50 p-3">
                      <Text size="xs" className="font-semibold text-foreground">
                        {conflict.domain} • {conflict.recordId}
                      </Text>
                      <Text size="xs" className="mt-1 text-muted-foreground">
                        {conflict.reason === 'deletion_conflict' ? 'Local and remote deletion/update differ.' : 'Both local and remote versions changed.'}
                      </Text>
                      {conflict.reason === 'invalid_remote' ? (
                        <Text size="xs" className="mt-2 font-bold text-amber-600 dark:text-amber-400">Remote version is invalid. Local data was preserved.</Text>
                      ) : (
                        <View className="mt-2 flex-row gap-2">
                          <ScalePressable onPress={() => void resolveKeepLocal(conflict.conflictId)}>
                            <Text size="xs" className="font-bold text-sky-500">Keep Local</Text>
                          </ScalePressable>
                          <ScalePressable onPress={() => void resolveKeepRemote(conflict.conflictId)}>
                            <Text size="xs" className="font-bold text-sky-500">Keep Remote</Text>
                          </ScalePressable>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          </FadeInView>

          <FadeInView delay={300}>
            <Card className="w-full p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-3xl mt-4">
              <View className="flex-row items-center gap-3">
                <ShieldCheck size={24} className="text-emerald-500" />
                <View className="flex-1">
                  <Text size="xs" className="font-bold text-emerald-600 dark:text-emerald-400">
                    Jeevya Security Core Active
                  </Text>
                  <Text size="xs" className="text-muted-foreground mt-0.5">
                    Local offline sync • End-to-end device storage
                  </Text>
                </View>
              </View>
            </Card>
          </FadeInView>
        </View>
      </ScrollView>
      <AccountGate
        visible={gate.visible}
        title={gate.title}
        explanation={gate.explanation}
        onSignIn={() => signIn('/settings')}
        onCreateAccount={() => createAccount('/settings')}
        onDismiss={dismiss}
      />
    </View>
  );
}
