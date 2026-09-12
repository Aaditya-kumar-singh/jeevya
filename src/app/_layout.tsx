import "@/global.css";
import { DarkTheme, DefaultTheme, ThemeProvider , Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

SplashScreen.preventAutoHideAsync();

import { useEffect } from "react";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    
    <GluestackUIProvider mode="system">
      <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="health/workout" options={{ headerShown: false }} />
          <Stack.Screen name="health/exercises" options={{ headerShown: false }} />
          <Stack.Screen name="health/sleep" options={{ headerShown: false }} />
          <Stack.Screen name="health/nutrition" options={{ headerShown: false }} />
          <Stack.Screen name="finance/transactions" options={{ headerShown: false }} />
          <Stack.Screen name="finance/budget" options={{ headerShown: false }} />
          <Stack.Screen name="finance/goals" options={{ headerShown: false }} />
          <Stack.Screen name="books/index" options={{ headerShown: false }} />
          <Stack.Screen name="books/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="journal/index" options={{ headerShown: false }} />
          <Stack.Screen name="settings/index" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
    </GluestackUIProvider>
  
  );
}

