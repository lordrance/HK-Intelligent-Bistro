import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useBistroStore } from "../../src/store/bistroStore";
import { getApiBaseUrl } from "../../src/lib/api";
import { formatCartActionSummary } from "@hk/shared";
import { useAppShell } from "../../src/lib/responsive";

const C = {
  bg: "#07080b",
  text: "#fdf8ef",
  muted: "rgba(255,255,255,0.55)",
  gold: "#c9a24d",
  goldSoft: "#f3e7c7",
  line: "rgba(255,255,255,0.12)",
  glass: "rgba(255,255,255,0.04)",
};

export default function AssistantScreen() {
  const shell = useAppShell();
  const catalog = useBistroStore((s) => s.catalog);
  const cart = useBistroStore((s) => s.cart);
  const messages = useBistroStore((s) => s.messages);
  const pending = useBistroStore((s) => s.pending);
  const send = useBistroStore((s) => s.sendUserMessage);
  const confirm = useBistroStore((s) => s.confirmPending);
  const dismiss = useBistroStore((s) => s.dismissPending);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const onSend = async () => {
    const t = text.trim();
    if (!t || !catalog) return;
    setBusy(true);
    setText("");
    try {
      await send(getApiBaseUrl(), t);
    } finally {
      setBusy(false);
    }
  };

  const bubbleMaxStyle = shell.isWeb ? { maxWidth: Math.min(560, shell.innerWidth * 0.92) } : { maxWidth: "86%" as const };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.page, { paddingTop: 52, paddingHorizontal: shell.pagePadding }]}>
        <View style={styles.shell}>
          <View style={{ gap: 6, marginBottom: 12 }}>
            <Text style={styles.kicker}>Concierge</Text>
            <Text style={styles.title}>AI concierge</Text>
            <Text style={[styles.hint, shell.isWideWeb && styles.hintWide]}>
              Hybrid policy: high-confidence add-only intents apply instantly; destructive edits ask for confirmation
              first.
            </Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16, gap: 10 }}
          >
            {messages.length === 0 ? (
              <View style={styles.tipBox}>
                <Text style={{ color: C.muted, fontSize: 14 }}>Try saying:</Text>
                <Text style={{ color: "rgba(233,213,161,0.9)", fontSize: 14 }}>
                  “One medium HK Silk Milk Tea, hot please.”
                </Text>
                <Text style={{ color: "rgba(233,213,161,0.9)", fontSize: 14 }}>“Clear my cart.”</Text>
              </View>
            ) : null}

            {messages.map((m, idx) => {
              const mine = m.role === "user";
              return (
                <View key={idx} style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
                  <View
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: mine ? "rgba(201,162,77,0.35)" : "rgba(255,255,255,0.1)",
                      backgroundColor: mine ? "rgba(201,162,77,0.12)" : C.glass,
                      ...bubbleMaxStyle,
                    }}
                  >
                    <Text style={{ color: "#f3f0e6", fontSize: 14, lineHeight: 22 }}>{m.content}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {pending && catalog ? (
            <View style={styles.pending}>
              <Text style={{ fontWeight: "900", color: C.goldSoft, fontSize: 15 }}>Pending changes</Text>
              <Text style={{ fontSize: 12, color: C.muted }}>Confidence: {pending.confidence.toFixed(2)}</Text>
              {pending.actions.map((a, i) => (
                <Text key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                  • {formatCartActionSummary(catalog, cart, a)}
                </Text>
              ))}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                <Pressable style={{ flex: 1 }} onPress={() => confirm()}>
                  <LinearGradient
                    colors={[C.gold, C.goldSoft]}
                    style={{ borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
                  >
                    <Text style={{ color: "#1a1204", fontWeight: "900" }}>Apply to cart</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable style={[styles.ignoreBtn, { flex: 1 }]} onPress={() => dismiss()}>
                  <Text style={{ color: "#f3f0e6", fontWeight: "800", textAlign: "center" }}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={{ paddingBottom: 10, paddingTop: 6 }}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Describe what you would like…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={text}
                onChangeText={setText}
                onSubmitEditing={onSend}
                editable={!busy}
              />
              <Pressable onPress={onSend} disabled={busy}>
                <LinearGradient colors={[C.gold, C.goldSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 }}>
                    <Text style={{ fontWeight: "900", color: "#1a1204" }}>{busy ? "…" : "Send"}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  shell: { flex: 1, width: "100%", maxWidth: 960, alignSelf: "center" },
  kicker: { fontSize: 12, color: "rgba(233,213,161,0.85)", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 30, fontWeight: "900", color: C.text },
  hint: { fontSize: 13, color: C.muted, maxWidth: 380, lineHeight: 20 },
  hintWide: { maxWidth: 720 },
  tipBox: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  pending: {
    gap: 8,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(201,162,77,0.45)",
    backgroundColor: "rgba(201,162,77,0.08)",
    marginBottom: 8,
  },
  ignoreBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.glass,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  input: { flex: 1, minHeight: 44, color: "#f3f0e6", fontSize: 15 },
});
