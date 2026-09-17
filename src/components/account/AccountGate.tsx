import { Modal, Pressable, View } from 'react-native';
import { ShieldCheck, X } from 'lucide-react-native';

import { Button, ButtonText, Card, Heading, Text } from '@/components/ui';
import { FadeInView } from '@/components/motion/FadeInView';

export interface AccountGateProps {
  visible: boolean;
  title: string;
  explanation: string;
  onSignIn: () => void;
  onCreateAccount: () => void;
  onDismiss: () => void;
}

export function AccountGate({
  visible,
  title,
  explanation,
  onSignIn,
  onCreateAccount,
  onDismiss,
}: AccountGateProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-black/40 px-5">
        <Pressable className="absolute inset-0" onPress={onDismiss} accessibilityLabel="Dismiss account required" />
        <FadeInView className="w-full max-w-md">
          <Card className="w-full rounded-3xl border border-border/60 bg-card p-5 shadow-lg">
            <View className="flex-row items-start gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15">
                <ShieldCheck size={21} className="text-sky-500" />
              </View>
              <View className="flex-1 pr-1">
                <Heading size="lg" className="font-bold">{title}</Heading>
                <Text size="sm" className="mt-1.5 text-muted-foreground">
                  {explanation}
                </Text>
              </View>
              <Pressable
                onPress={onDismiss}
                className="h-9 w-9 items-center justify-center rounded-xl bg-muted/60"
                accessibilityRole="button"
                accessibilityLabel="Not now"
              >
                <X size={18} className="text-muted-foreground" />
              </Pressable>
            </View>

            <Text size="xs" className="mt-4 rounded-2xl bg-sky-500/5 p-3 text-muted-foreground">
              Your local LifeOS data remains on this device.
            </Text>

            <View className="mt-4 gap-2.5">
              <Button onPress={onSignIn}>
                <ButtonText>Sign in</ButtonText>
              </Button>
              <Button variant="outline" onPress={onCreateAccount}>
                <ButtonText>Create account</ButtonText>
              </Button>
              <Button variant="ghost" onPress={onDismiss}>
                <ButtonText>Not now</ButtonText>
              </Button>
            </View>
          </Card>
        </FadeInView>
      </View>
    </Modal>
  );
}
