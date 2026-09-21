import "@/global.css";
import { useEffect } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { JeevyaThemeProvider } from "@/lib/themeContext";
import { useTheme } from "@/hooks/use-theme";
import { AndroidWidgetRefreshBridge } from "@/components/widgets/AndroidWidgetRefreshBridge";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <JeevyaThemeProvider>
      <ThemeShell />
    </JeevyaThemeProvider>
  );
}

function ThemeShell() {
  const { isDark } = useTheme();
  const navigationTheme = isDark ? DarkTheme : DefaultTheme;

  return (
    <GluestackUIProvider mode={isDark ? 'dark' : 'light'}>
      <AndroidWidgetRefreshBridge />
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="goals" options={{ headerShown: false }} />
            <Stack.Screen name="health/workout" options={{ headerShown: false }} />
            <Stack.Screen name="health/exercises" options={{ headerShown: false }} />
            <Stack.Screen name="health/sleep" options={{ headerShown: false }} />
            <Stack.Screen name="health/nutrition" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition/index" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition/log" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition/meals" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition/custom-foods" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition/custom-food-edit" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition/recipes" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition/recipe" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition/recipe-edit" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition/targets" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition/energy" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition/analytics" options={{ headerShown: false }} />
            <Stack.Screen name="nutrition/insights" options={{ headerShown: false }} />
            <Stack.Screen name="finance/transactions" options={{ headerShown: false }} />
            <Stack.Screen name="finance/budget" options={{ headerShown: false }} />
            <Stack.Screen name="finance/add-budget" options={{ headerShown: false }} />
            <Stack.Screen name="finance/edit-budget/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="finance/goals" options={{ headerShown: false }} />
            <Stack.Screen name="finance/savings-goals" options={{ headerShown: false }} />
            <Stack.Screen name="finance/savings-goals/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="finance/add-savings-goal" options={{ headerShown: false }} />
            <Stack.Screen name="finance/edit-savings-goal/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="finance/add-expense" options={{ headerShown: false }} />
            <Stack.Screen name="finance/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="finance/add-income" options={{ headerShown: false }} />
            <Stack.Screen name="finance/add-account" options={{ headerShown: false }} />
            <Stack.Screen name="finance/transfer" options={{ headerShown: false }} />
            <Stack.Screen name="finance/accounts" options={{ headerShown: false }} />
            <Stack.Screen name="finance/accounts/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="finance/analytics" options={{ headerShown: false }} />
            <Stack.Screen name="finance/export" options={{ headerShown: false }} />
            <Stack.Screen name="books/index" options={{ headerShown: false }} />
            <Stack.Screen name="books/new" options={{ headerShown: false }} />
            <Stack.Screen name="books/goals" options={{ headerShown: false }} />
            <Stack.Screen name="books/analytics" options={{ headerShown: false }} />
            <Stack.Screen name="books/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="books/[id]/edit" options={{ headerShown: false }} />
            <Stack.Screen name="journal/index" options={{ headerShown: false }} />
            <Stack.Screen name="journal/new" options={{ headerShown: false }} />
            <Stack.Screen name="journal/calendar" options={{ headerShown: false }} />
            <Stack.Screen name="journal/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="journal/[id]/edit" options={{ headerShown: false }} />
            <Stack.Screen name="settings/index" options={{ headerShown: false }} />
            <Stack.Screen name="settings/appearance" options={{ headerShown: false }} />
            <Stack.Screen name="habits/index" options={{ headerShown: false }} />
            <Stack.Screen name="habits/new" options={{ headerShown: false }} />
            <Stack.Screen name="habits/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="habits/[id]/edit" options={{ headerShown: false }} />
            <Stack.Screen name="tasks/index" options={{ headerShown: false }} />
            <Stack.Screen name="tasks/calendar" options={{ headerShown: false }} />
            <Stack.Screen name="tasks/analytics" options={{ headerShown: false }} />
            <Stack.Screen name="tasks/new" options={{ headerShown: false }} />
            <Stack.Screen name="tasks/[id]" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GluestackUIProvider>
  );
}
