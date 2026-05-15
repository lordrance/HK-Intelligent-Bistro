import "react-native-gesture-handler";
import "./global.css";

import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/authStore";
import { useBistroStore } from "@/store/bistroStore";
import { getApiBaseUrl } from "@/lib/api";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const loadCatalog = useBistroStore((s) => s.loadCatalog);
  const catalogLoadedForUser = useRef<string | null>(null);

  useEffect(() => {
    void restoreSession(getApiBaseUrl());
  }, [restoreSession]);

  useEffect(() => {
    if (!hydrated) return;
    const first = segments[0];
    const inAuth = first === "login" || first === "register";
    if (!user && !inAuth) {
      router.replace("/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [hydrated, user, segments, router]);

  useEffect(() => {
    if (!hydrated || !user) {
      catalogLoadedForUser.current = null;
      return;
    }
    if (catalogLoadedForUser.current === user.id) return;
    catalogLoadedForUser.current = user.id;
    void loadCatalog(getApiBaseUrl());
  }, [hydrated, user, loadCatalog]);

  if (!hydrated) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <View className="flex-1 items-center justify-center bg-bistro-bg">
            <ActivityIndicator color="#d4af65" size="large" />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#05060a" },
            animation: "fade",
          }}
        >
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="dish/[id]"
            options={{
              presentation: "transparentModal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="checkout"
            options={{
              presentation: "card",
              animation: "slide_from_bottom",
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
