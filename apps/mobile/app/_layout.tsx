import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useBistroStore } from "../src/store/bistroStore";
import { getApiBaseUrl } from "../src/lib/api";

export default function RootLayout() {
  const loadCatalog = useBistroStore((s) => s.loadCatalog);

  useEffect(() => {
    void loadCatalog(getApiBaseUrl());
  }, [loadCatalog]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#07080b" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="dish/[id]"
          options={{
            presentation: "transparentModal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </>
  );
}
