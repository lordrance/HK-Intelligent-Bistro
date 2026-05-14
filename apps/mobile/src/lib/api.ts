import Constants from "expo-constants";
import { Platform } from "react-native";

/** 真机调试可设置 EXPO_PUBLIC_API_BASE_URL 指向电脑局域网 IP */
export function getApiBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  if (fromExtra && fromExtra.length > 0) return fromExtra.replace(/\/$/, "");
  if (Platform.OS === "android") return "http://10.0.2.2:8787";
  return "http://127.0.0.1:8787";
}
