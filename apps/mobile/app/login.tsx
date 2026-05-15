import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";

import { Button, ButtonText } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { T } from "@/theme/tokens";

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setError(null);
    const em = email.trim().toLowerCase();
    if (!em.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : `HTTP ${res.status}`;
        setError(msg === "invalid_credentials" ? "Wrong email or password." : `Could not sign in (${msg}).`);
        return;
      }
      if (
        !body ||
        typeof body !== "object" ||
        !("token" in body) ||
        !("user" in body) ||
        typeof (body as { token: unknown }).token !== "string"
      ) {
        setError("Unexpected server response.");
        return;
      }
      const { token, user } = body as { token: string; user: { id: string; email: string } };
      await setSession(token, user);
      router.replace("/(tabs)");
    } catch {
      setError("Network error. Is the API running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-bistro-bg" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-1 bg-bistro-bg">
        <LinearGradient colors={["#0a0c12", T.bg, "#12151f"]} style={StyleSheet.absoluteFill} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 22,
            paddingTop: 72,
            paddingBottom: 40,
            maxWidth: 440,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <Text className="mb-2 text-xs font-medium tracking-[2px]" style={{ color: T.goldDim }}>
            Intelligent Bistro
          </Text>
          <Text className="mb-2 font-black tracking-[-0.5px] text-bistro-text" style={{ fontSize: T.titlePage }}>
            Sign in
          </Text>
          <Text className="mb-7 text-sm leading-[22px] text-bistro-muted">Use the account you registered with. The menu loads after you sign in.</Text>

          <View className="mb-4">
            <Text className="mb-1.5 text-xs font-bold text-bistro-gold-dim">Email</Text>
            <Input
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View className="mb-4">
            <Text className="mb-1.5 text-xs font-bold text-bistro-gold-dim">Password</Text>
            <Input placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
          </View>

          {error ? <Text className="mb-3 text-sm text-red-300">{error}</Text> : null}

          <Button
            className="mt-2"
            variant="primary"
            disabled={busy}
            onPress={() => void onSubmit()}
          >
            {busy ? <ActivityIndicator color={T.bg} /> : <ButtonText variant="primary">Sign in</ButtonText>}
          </Button>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <Text className="text-bistro-muted">New here?</Text>
            <Link href="/register" asChild>
              <Pressable>
                <Text className="font-extrabold text-bistro-gold-soft">Create an account</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
