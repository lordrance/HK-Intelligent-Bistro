import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { BistroScreenBackground } from "@/components/BistroScreenBackground";
import { Button, ButtonText } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { formatCartActionSummary } from "@hk/shared";
import { getApiBaseUrl } from "@/lib/api";
import { useAppShell } from "@/lib/responsive";
import { scrollViewFill } from "@/lib/scrollStyles";
import { useBistroStore } from "@/store/bistroStore";
import { T } from "@/theme/tokens";

export default function AssistantScreen() {
  const shell = useAppShell();
  const catalog = useBistroStore((s) => s.catalog);
  const catalogLoading = useBistroStore((s) => s.catalogLoading);
  const loadCatalog = useBistroStore((s) => s.loadCatalog);
  const cart = useBistroStore((s) => s.cart);
  const messages = useBistroStore((s) => s.messages);
  const pending = useBistroStore((s) => s.pending);
  const send = useBistroStore((s) => s.sendUserMessage);
  const confirm = useBistroStore((s) => s.confirmPending);
  const dismiss = useBistroStore((s) => s.dismissPending);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const titleSize = shell.compactWeb ? T.titlePageCompact : T.titlePage;
  const pagePad = { paddingHorizontal: shell.pagePadding };

  const onSend = async () => {
    const t = text.trim();
    if (!t) return;
    if (catalogLoading || !catalog) return;
    setBusy(true);
    setText("");
    try {
      await send(getApiBaseUrl(), t);
    } finally {
      setBusy(false);
    }
  };

  const canSend = !!catalog && !catalogLoading && !busy;

  const chatGutter = shell.pagePadding * 2 + 16;
  const bubbleMaxStyle = shell.isWeb
    ? { maxWidth: Math.min(520, Math.max(220, shell.innerWidth - chatGutter)), minWidth: 0 as const }
    : { maxWidth: "86%" as const };

  const scrollContentPad = {
    paddingHorizontal: shell.pagePadding,
    paddingBottom: 16,
    gap: 10 as const,
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-1 bg-bistro-bg pt-12" style={pagePad}>
        <BistroScreenBackground />
        <View
          className="w-full max-w-[960px] flex-1 self-center"
          style={Platform.OS === "web" ? { minHeight: 0, overflow: "hidden" } : undefined}
        >
          <View className="mb-3 gap-1">
            <Text className="text-xs uppercase tracking-[2px] text-bistro-gold-dim">Concierge</Text>
            <Text className="font-black text-bistro-text" style={{ fontSize: titleSize }}>
              AI concierge
            </Text>
            <Text className="text-sm leading-6 text-bistro-muted" style={{ maxWidth: shell.isWideWeb ? 720 : 380 }}>
              Hybrid policy: high-confidence add-only intents apply instantly; destructive edits ask for confirmation
              first.
            </Text>
            {catalogLoading ? (
              <Text className="mt-1 text-sm text-bistro-gold-soft">Loading menu…</Text>
            ) : !catalog ? (
              <View className="mt-2.5 gap-2">
                <Text className="text-sm text-bistro-muted">The menu is not available. Fix the API connection, then tap Retry.</Text>
                <Button className="self-start" variant="outline" onPress={() => void loadCatalog(getApiBaseUrl())}>
                  <ButtonText>Retry</ButtonText>
                </Button>
              </View>
            ) : null}
          </View>

          <ScrollView
            ref={scrollRef}
            className="flex-1 bg-bistro-bg"
            style={scrollViewFill()}
            showsVerticalScrollIndicator
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={scrollContentPad}
          >
            {messages.length === 0 ? (
              <View className="gap-2 rounded-bistro border border-bistro-line bg-bistro-glass p-5">
                <Text className="text-sm text-bistro-muted">Try saying:</Text>
                <Text className="text-sm text-[rgba(233,213,161,0.9)]">“One medium HK Silk Milk Tea, hot please.”</Text>
                <Text className="text-sm text-[rgba(233,213,161,0.9)]">“Clear my cart.”</Text>
              </View>
            ) : null}

            {messages.map((m, idx) => {
              const mine = m.role === "user";
              return (
                <View key={idx} className={mine ? "items-end" : "items-start"}>
                  <View
                    className={`min-w-0 rounded-md border p-3.5 ${mine ? "border-bistro-gold/35 bg-bistro-gold/15" : "border-bistro-line bg-bistro-glass"}`}
                    style={bubbleMaxStyle}
                  >
                    <Text
                      className="text-sm leading-6 text-[#f3f0e6]"
                      selectable={false}
                      style={Platform.OS === "web" ? ({ maxWidth: "100%" } as const) : undefined}
                    >
                      {m.content}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {pending && catalog ? (
            <View className="mb-2 gap-2 rounded-bistro border border-bistro-gold/45 bg-bistro-gold/10 p-3.5">
              <Text className="text-base font-black text-bistro-gold-soft">Pending changes</Text>
              <Text className="text-xs text-bistro-muted">Confidence: {pending.confidence.toFixed(2)}</Text>
              {pending.actions.map((a, i) => (
                <Text key={i} className="text-sm text-white/75">
                  • {formatCartActionSummary(catalog, cart, a)}
                </Text>
              ))}
              <View className="mt-1.5 flex-row gap-2">
                <Button className="flex-1" variant="primary" onPress={() => confirm()}>
                  <ButtonText variant="primary">Apply to cart</ButtonText>
                </Button>
                <Button className="flex-1" variant="outline" onPress={() => dismiss()}>
                  <ButtonText>Dismiss</ButtonText>
                </Button>
              </View>
            </View>
          ) : null}

          <View className="pb-2.5 pt-1.5">
            <View className="flex-row items-center gap-2 rounded-bistro border border-bistro-line bg-bistro-glass px-3 py-1.5">
              <View className="min-h-[44px] flex-1">
                <Input
                  containerClassName="border-0 bg-transparent px-0 py-0"
                  className="text-base text-[#f3f0e6]"
                  placeholder="Describe what you would like…"
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={onSend}
                  editable={!busy}
                />
              </View>
              <Pressable disabled={!canSend} className={!canSend ? "opacity-45" : undefined} onPress={onSend}>
                <LinearGradient colors={[T.gold, T.goldSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View className="rounded-sm px-4 py-2.5">
                    <Text className="font-black text-[#1a1204]">{busy ? "…" : "Send"}</Text>
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
