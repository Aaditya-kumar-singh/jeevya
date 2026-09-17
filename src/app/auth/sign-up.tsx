import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ButtonText, Card, Heading, Input, InputField, Text } from '@/components/ui';
import { FadeInView } from '@/components/motion/FadeInView';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { useAuth } from '@/hooks/useAuth';
import { isSafeReturnPath } from '@/services/accountGate';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { returnTo: rawReturnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = typeof rawReturnTo === 'string' && isSafeReturnPath(rawReturnTo) ? rawReturnTo : undefined;
  const { isLoading: authLoading, isAuthenticated, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setBusy(true); setError(null); setMessage(null);
    const result = await signUp(email, password);
    setBusy(false);
    if (!result.ok) setError(result.error);
    else if (result.confirmationRequired) {
      setMessage(result.message ?? 'Check your email to confirm your account.');
      if (returnTo) router.replace(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}` as never);
    } else if (returnTo) router.replace(returnTo as never);
    else router.replace('/auth/sign-in' as never);
  };

  return (
    <View className="flex-1 bg-sky-50/40 dark:bg-slate-950 relative">
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}><FloatingBlobsSVG color1="#38BDF8" color2="#6366F1" width={450} height={350} /></View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Math.max(insets.top + 12, 48), paddingBottom: 48 }}>
          <View className="gap-4 px-5">
            <Button variant="ghost" size="icon" className="self-start" onPress={() => router.back()}><ButtonText>‹</ButtonText></Button>
            <FadeInView>
              <Card className="w-full p-5 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl">
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15"><UserPlus size={24} className="text-indigo-500" /></View>
                  <View className="flex-1"><Text size="xs" className="font-semibold text-indigo-500 uppercase tracking-wider">LifeOS Account</Text><Heading size="xl" className="mt-1 font-bold">Create account</Heading><Text size="sm" className="mt-1 text-muted-foreground">Create an account without changing your local data.</Text></View>
                </View>
                {authLoading ? <View className="mt-6"><ActivityIndicator /></View> : isAuthenticated ? <View className="mt-6 gap-3"><Text size="sm" className="font-semibold">An account is already active.</Text><Button variant="outline" onPress={() => router.replace('/auth/sign-in' as never)}><ButtonText>Back to account</ButtonText></Button></View> : (
                  <View className="mt-6 gap-3">
                    <Input><InputField value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" /></Input>
                    <Input><InputField value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry autoComplete="new-password" /></Input>
                    <Button onPress={() => void handleSignUp()} disabled={busy}><ButtonText>{busy ? 'Creating account...' : 'Create account'}</ButtonText></Button>
                    {message ? <Text size="xs" className="font-semibold text-emerald-600">{message}</Text> : null}
                    {error ? <Text size="xs" className="font-semibold text-destructive">{error}</Text> : null}
                    <Button variant="link" size="sm" onPress={() => router.replace('/auth/sign-in' as never)}><ButtonText>Already have an account? Sign in</ButtonText></Button>
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
