import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Box,
  Button,
  ButtonText,
  HStack,
  Heading,
  Input,
  InputField,
  Pressable,
  Text,
  VStack,
} from "@gluestack-ui/themed";
import { useBistroStore } from "../../src/store/bistroStore";
import { getApiBaseUrl } from "../../src/lib/api";
import { formatCartActionSummary } from "@hk/shared";
import { useAppShell } from "../../src/lib/responsive";
import { scrollViewFill } from "../../src/lib/scrollStyles";
import { T } from "../../src/theme/tokens";

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

  const bubbleMaxStyle = shell.isWeb ? { maxWidth: Math.min(560, shell.innerWidth * 0.92) } : { maxWidth: "86%" as const };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Box flex={1} bg={T.bg} pt="$12" px={shell.pagePadding}>
        <LinearGradient colors={["#0a0c12", T.bg, "#12151f"]} style={StyleSheet.absoluteFill} />
        <VStack flex={1} maxWidth={960} w="100%" alignSelf="center">
          <VStack space="xs" mb="$3">
            <Text fontSize="$xs" color={T.goldDim} letterSpacing={2} textTransform="uppercase">
              Concierge
            </Text>
            <Heading size="xl" fontWeight="$black" fontSize={titleSize} color={T.text}>
              AI concierge
            </Heading>
            <Text fontSize="$sm" maxWidth={shell.isWideWeb ? 720 : 380} lineHeight="$md" color={T.muted}>
              Hybrid policy: high-confidence add-only intents apply instantly; destructive edits ask for confirmation
              first.
            </Text>
            {catalogLoading ? (
              <Text fontSize="$sm" color={T.goldSoft} mt="$1">
                Loading menu…
              </Text>
            ) : !catalog ? (
              <VStack mt="$2.5" space="sm">
                <Text fontSize="$sm" color={T.muted}>
                  The menu is not available. Fix the API connection, then tap Retry.
                </Text>
                <Button variant="outline" action="primary" alignSelf="flex-start" onPress={() => void loadCatalog(getApiBaseUrl())}>
                  <ButtonText>Retry</ButtonText>
                </Button>
              </VStack>
            ) : null}
          </VStack>

          <ScrollView
            ref={scrollRef}
            style={scrollViewFill()}
            showsVerticalScrollIndicator
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={{ paddingBottom: 16, gap: 10 }}
          >
            {messages.length === 0 ? (
              <VStack p="$5" borderRadius="$lg" borderWidth={1} borderColor={T.line} space="sm" bg={T.glass}>
                <Text color={T.muted} fontSize="$sm">
                  Try saying:
                </Text>
                <Text color="rgba(233,213,161,0.9)" fontSize="$sm">
                  “One medium HK Silk Milk Tea, hot please.”
                </Text>
                <Text color="rgba(233,213,161,0.9)" fontSize="$sm">
                  “Clear my cart.”
                </Text>
              </VStack>
            ) : null}

            {messages.map((m, idx) => {
              const mine = m.role === "user";
              return (
                <Box key={idx} alignItems={mine ? "flex-end" : "flex-start"}>
                  <Box
                    p="$3.5"
                    borderRadius="$md"
                    borderWidth={1}
                    borderColor={mine ? "rgba(212,175,101,0.35)" : T.line}
                    bg={mine ? "rgba(212,175,101,0.12)" : T.glass}
                    {...bubbleMaxStyle}
                  >
                    <Text color="#f3f0e6" fontSize="$sm" lineHeight="$md">
                      {m.content}
                    </Text>
                  </Box>
                </Box>
              );
            })}
          </ScrollView>

          {pending && catalog ? (
            <VStack
              space="sm"
              borderRadius="$lg"
              p="$3.5"
              borderWidth={1}
              borderColor="rgba(212,175,101,0.45)"
              bg="rgba(212,175,101,0.08)"
              mb="$2"
            >
              <Text fontWeight="$black" color={T.goldSoft} fontSize="$md">
                Pending changes
              </Text>
              <Text fontSize="$xs" color={T.muted}>
                Confidence: {pending.confidence.toFixed(2)}
              </Text>
              {pending.actions.map((a, i) => (
                <Text key={i} fontSize="$sm" color="rgba(255,255,255,0.75)">
                  • {formatCartActionSummary(catalog, cart, a)}
                </Text>
              ))}
              <HStack space="sm" mt="$1.5">
                <Button flex={1} action="primary" onPress={() => confirm()}>
                  <ButtonText>Apply to cart</ButtonText>
                </Button>
                <Button flex={1} variant="outline" action="secondary" onPress={() => dismiss()}>
                  <ButtonText>Dismiss</ButtonText>
                </Button>
              </HStack>
            </VStack>
          ) : null}

          <Box pb="$2.5" pt="$1.5">
            <HStack
              alignItems="center"
              space="sm"
              borderRadius="$lg"
              borderWidth={1}
              borderColor={T.line}
              bg={T.glass}
              px="$3"
              py="$1.5"
            >
              <Input flex={1} variant="outline" size="sm" borderWidth={0} bg="transparent">
                <InputField
                  placeholder="Describe what you would like…"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={onSend}
                  editable={!busy}
                  color="#f3f0e6"
                  fontSize="$md"
                  style={{ minHeight: 44 }}
                />
              </Input>
              <Pressable onPress={onSend} disabled={!canSend} opacity={canSend ? 1 : 0.45}>
                <LinearGradient colors={[T.gold, T.goldSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Box px="$4" py="$2.5" borderRadius="$sm">
                    <Text fontWeight="$black" color="#1a1204">
                      {busy ? "…" : "Send"}
                    </Text>
                  </Box>
                </LinearGradient>
              </Pressable>
            </HStack>
          </Box>
        </VStack>
      </Box>
    </KeyboardAvoidingView>
  );
}
