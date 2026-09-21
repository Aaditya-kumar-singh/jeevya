import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ButtonText, Card, Heading, Input, InputField, Text } from '@/components/ui';
import { FadeInView } from '@/components/motion/FadeInView';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { useAuth } from '@/hooks/useAuth';
import { isSafeReturnPath } from '@/services/accountGate';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { returnTo: rawReturnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = typeof rawReturnTo === 'string' && isSafeReturnPath(rawReturnTo) ? rawReturnTo : undefined;
  const { isLoading: authLoading, isAuthenticated, user, authError, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setBusy(true); setError(null); setMessage(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) setError(result.error);
    else if (returnTo) router.replace(returnTo as never);
    else router.replace('/(tabs)' as never);
  };

  const handleSignOut = async () => {
    setBusy(true); setError(null);
    const result = await signOut();
    setBusy(false);
    if (result.authError) setError(result.authError);
    else setMessage('Signed out. Your local Jeevya data is unchanged.');
  };

  return (
    <View className="flex-1 bg-sky-50/40 dark:bg-slate-950 relative">
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <FloatingBlobsSVG color1="#38BDF8" color2="#6366F1" width={450} height={350} />
      </View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Math.max(insets.top + 12, 48), paddingBottom: 48 }}>
          <View className="gap-4 px-5">
            <Button variant="ghost" size="icon" className="self-start" onPress={() => router.back()}>
              <ButtonText>‹</ButtonText>
            </Button>
            <FadeInView>
              <Card className="w-full p-5 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl">
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15">
                    <ShieldCheck size={24} className="text-sky-500" />
                  </View>
                  <View className="flex-1">
                    <Text size="xs" className="font-semibold text-sky-500 uppercase tracking-wider">Jeevya Account</Text>
                    <Heading size="xl" className="mt-1 font-bold">Sign in</Heading>
                    <Text size="sm" className="mt-1 text-muted-foreground">Your local Jeevya data stays on this device.</Text>
                  </View>
                </View>

                {authLoading ? <View className="mt-6"><ActivityIndicator /></View> : isAuthenticated ? (
                  <View className="mt-6 gap-3">
                    <Text size="sm" className="font-semibold">Signed in as</Text>
                    <Text size="sm" className="text-muted-foreground">{user?.email ?? 'Authenticated account'}</Text>
                    <Button variant="outline" onPress={handleSignOut} disabled={busy}>
                      <ButtonText>{busy ? 'Signing out...' : 'Sign out'}</ButtonText>
                    </Button>
                    {message ? <Text size="xs" className="font-semibold text-emerald-600">{message}</Text> : null}
                    {error ? <Text size="xs" className="font-semibold text-destructive">{error}</Text> : null}
                  </View>
                ) : (
                  <View className="mt-6 gap-3">
                    <Input><InputField value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" /></Input>
                    <Input><InputField value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry autoComplete="password" /></Input>
                    <Button onPress={() => void handleSignIn()} disabled={busy}>
                      <ButtonText>{busy ? 'Signing in...' : 'Sign in'}</ButtonText>
                    </Button>
                    {message ? <Text size="xs" className="font-semibold text-emerald-600">{message}</Text> : null}
                    {error ? <Text size="xs" className="font-semibold text-destructive">{error}</Text> : null}
                    {authError && !error ? <Text size="xs" className="font-semibold text-destructive">{authError}</Text> : null}
                    <Button variant="link" size="sm" onPress={() => router.push('/auth/forgot-password' as never)}><ButtonText>Forgot password?</ButtonText></Button>
                    <Button variant="outline" size="sm" onPress={() => router.push('/auth/sign-up' as never)}><ButtonText>Create account</ButtonText></Button>
                    <Button variant="ghost" size="sm" onPress={() => router.back()}><ButtonText>Continue as guest</ButtonText></Button>
                  </View>
                )}
              </Card>
            </FadeInView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
