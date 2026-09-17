import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ButtonText, Card, Heading, Input, InputField, Text } from '@/components/ui';
import { FadeInView } from '@/components/motion/FadeInView';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setError(null); setMessage(null);
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (result.ok) setMessage(result.message ?? 'If an account uses this email, you will receive password reset instructions.');
    else setError(result.error);
  };
  return (
    <View className="flex-1 bg-sky-50/40 dark:bg-slate-950 relative">
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}><FloatingBlobsSVG color1="#38BDF8" color2="#6366F1" width={450} height={350} /></View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Math.max(insets.top + 12, 48), paddingBottom: 48 }}>
          <View className="gap-4 px-5">
            <Button variant="ghost" size="icon" className="self-start" onPress={() => router.back()}><ButtonText>‹</ButtonText></Button>
            <FadeInView><Card className="w-full p-5 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl">
              <View className="flex-row items-center gap-3"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15"><KeyRound size={24} className="text-sky-500" /></View><View className="flex-1"><Text size="xs" className="font-semibold text-sky-500 uppercase tracking-wider">LifeOS Account</Text><Heading size="xl" className="mt-1 font-bold">Forgot password</Heading><Text size="sm" className="mt-1 text-muted-foreground">Request a secure password reset email.</Text></View></View>
              <View className="mt-6 gap-3"><Input><InputField value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" /></Input><Button onPress={() => void submit()} disabled={busy}><ButtonText>{busy ? 'Sending...' : 'Send reset email'}</ButtonText></Button>{message ? <Text size="xs" className="font-semibold text-emerald-600">{message}</Text> : null}{error ? <Text size="xs" className="font-semibold text-destructive">{error}</Text> : null}<Button variant="outline" size="sm" onPress={() => router.replace('/auth/sign-in' as never)}><ButtonText>Back to sign in</ButtonText></Button><Button variant="ghost" size="sm" onPress={() => router.back()}><ButtonText>Continue as guest</ButtonText></Button></View>
            </Card></FadeInView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
