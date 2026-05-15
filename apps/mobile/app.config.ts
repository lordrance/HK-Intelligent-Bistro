import type { ExpoConfig } from "expo/config";

export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  name: "Intelligent Bistro",
  slug: "hk-intelligent-bistro",
  plugins: [...(config.plugins ?? []), "expo-secure-store"],
  extra: {
    ...config.extra,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  },
});
