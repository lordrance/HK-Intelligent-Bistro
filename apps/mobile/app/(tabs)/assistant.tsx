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
import type { CartAction } from "@hk/shared";

const C = {
  bg: "#07080b",
  text: "#fdf8ef",
  muted: "rgba(255,255,255,0.55)",
  gold: "#c9a24d",
  goldSoft: "#f3e7c7",
  line: "rgba(255,255,255,0.12)",
  glass: "rgba(255,255,255,0.04)",
};

function summarizeAction(a: CartAction): string {
  switch (a.type) {
    case "ADD_LINE":
      return `新增 ${a.qty} 行（${a.dishId}）`;
    case "REMOVE_LINE":
      return `删除行 ${a.lineId.slice(0, 8)}…`;
    case "SET_QTY":
      return `改数量 → ${a.qty}`;
    case "UPDATE_MODIFIERS":
      return "更新规格";
    case "CLEAR_CART":
      return "清空购物车";
    case "REPLACE_DISH":
      return `替换菜品 → ${a.newDishId}`;
    default:
      return "未知动作";
  }
}

export default function AssistantScreen() {
  const catalog = useBistroStore((s) => s.catalog);
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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.page, { paddingTop: 52 }]}>
        <View style={{ gap: 6, marginBottom: 12 }}>
          <Text style={styles.kicker}>Concierge</Text>
          <Text style={styles.title}>AI 点餐助手</Text>
          <Text style={styles.hint}>
            混合策略：高置信度「仅加购」会自动落袋；涉及删除/替换/改规格等，会先让你确认。
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
              <Text style={{ color: C.muted, fontSize: 14 }}>试试：</Text>
              <Text style={{ color: "rgba(233,213,161,0.9)", fontSize: 14 }}>
                「来一杯中杯港式丝袜奶茶，热的」
              </Text>
              <Text style={{ color: "rgba(233,213,161,0.9)", fontSize: 14 }}>「清空购物车」</Text>
            </View>
          ) : null}

          {messages.map((m, idx) => {
            const mine = m.role === "user";
            return (
              <View key={idx} style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
                <View
                  style={{
                    maxWidth: "86%",
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: mine ? "rgba(201,162,77,0.35)" : "rgba(255,255,255,0.1)",
                    backgroundColor: mine ? "rgba(201,162,77,0.12)" : C.glass,
                  }}
                >
                  <Text style={{ color: "#f3f0e6", fontSize: 14, lineHeight: 22 }}>{m.content}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {pending ? (
          <View style={styles.pending}>
            <Text style={{ fontWeight: "900", color: C.goldSoft, fontSize: 15 }}>待确认的操作</Text>
            <Text style={{ fontSize: 12, color: C.muted }}>置信度：{pending.confidence.toFixed(2)}</Text>
            {pending.actions.map((a, i) => (
              <Text key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                • {summarizeAction(a)}
              </Text>
            ))}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              <Pressable style={{ flex: 1 }} onPress={() => confirm()}>
                <LinearGradient
                  colors={[C.gold, C.goldSoft]}
                  style={{ borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
                >
                  <Text style={{ color: "#1a1204", fontWeight: "900" }}>应用到购物车</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={[styles.ignoreBtn, { flex: 1 }]} onPress={() => dismiss()}>
                <Text style={{ color: "#f3f0e6", fontWeight: "800", textAlign: "center" }}>忽略</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={{ paddingBottom: 10, paddingTop: 6 }}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="用中文描述你想点的…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={text}
              onChangeText={setText}
              onSubmitEditing={onSend}
              editable={!busy}
            />
            <Pressable onPress={onSend} disabled={busy}>
              <LinearGradient colors={[C.gold, C.goldSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 }}>
                  <Text style={{ fontWeight: "900", color: "#1a1204" }}>{busy ? "…" : "发送"}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 18, backgroundColor: C.bg },
  kicker: { fontSize: 12, color: "rgba(233,213,161,0.85)", letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: "900", color: C.text },
  hint: { fontSize: 13, color: C.muted, maxWidth: 380, lineHeight: 20 },
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
