import { Tabs } from "expo-router";
import { Heart, Home, ListChecks, Settings2, Wallet } from "lucide-react-native";
import { useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  // Dynamic bottom padding to ensure the tab bar sits cleanly above 3-button or gesture navigation bar
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#6366F1", // Vibrant Indigo
        tabBarInactiveTintColor: isDark ? "#64748B" : "#94A3B8",
        tabBarStyle: {
          backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
          borderTopColor: isDark ? "#1E293B" : "#E2E8F0",
          borderTopWidth: 1,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
          elevation: 12,
          shadowColor: "#6366F1",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.2 : 0.08,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={focused ? 24 : 22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: "Health",
          tabBarIcon: ({ color, focused }) => (
            <Heart color={focused ? "#EF4444" : color} size={focused ? 24 : 22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, focused }) => (
            <ListChecks color={focused ? "#8B5CF6" : color} size={focused ? 24 : 22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: "Finance",
          tabBarIcon: ({ color, focused }) => (
            <Wallet color={focused ? "#10B981" : color} size={focused ? 24 : 22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <Settings2 color={focused ? "#F59E0B" : color} size={focused ? 24 : 22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
