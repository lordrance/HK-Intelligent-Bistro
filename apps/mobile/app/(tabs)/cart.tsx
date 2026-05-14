import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {
  Box,
  Button,
  ButtonText,
  HStack,
  Heading,
  Pressable,
  ScrollView,
  Text,
  VStack,
} from "@gluestack-ui/themed";
import { useAuthStore } from "../../src/store/authStore";
import { useBistroStore } from "../../src/store/bistroStore";
import { cartTotal, lineUnitPrice } from "../../src/lib/pricing";
import { useAppShell } from "../../src/lib/responsive";
import { getApiBaseUrl } from "../../src/lib/api";
import { scrollViewFill } from "../../src/lib/scrollStyles";
import { formatCatalogMoney } from "../../src/lib/formatMoney";
import { T } from "../../src/theme/tokens";

export default function CartScreen() {
  const router = useRouter();
  const shell = useAppShell();
  const catalog = useBistroStore((s) => s.catalog);
  const catalogLoading = useBistroStore((s) => s.catalogLoading);
  const loadCatalog = useBistroStore((s) => s.loadCatalog);
  const cart = useBistroStore((s) => s.cart);
  const setQty = useBistroStore((s) => s.setLineQty);
  const removeLine = useBistroStore((s) => s.removeLine);
  const clearCart = useBistroStore((s) => s.clearCart);
  const undo = useBistroStore((s) => s.undo);
  const resetAfterLogout = useBistroStore((s) => s.resetAfterLogout);

  const titleSize = shell.compactWeb ? T.titlePageCompact : T.titlePage;

  async function onLogout() {
    await useAuthStore.getState().clearSession();
    resetAfterLogout();
    router.replace("/login");
  }

  if (catalogLoading) {
    return (
      <Box flex={1} bg={T.bg} pt={56} px={shell.pagePadding}>
        <LinearGradient colors={["#0a0c12", T.bg, "#12151f"]} style={StyleSheet.absoluteFill} />
        <VStack maxWidth={960} w="100%" alignSelf="center">
          <Text color={T.muted}>Loading cart…</Text>
        </VStack>
      </Box>
    );
  }

  if (!catalog) {
    return (
      <Box flex={1} bg={T.bg} pt={56} px={shell.pagePadding}>
        <LinearGradient colors={["#0a0c12", T.bg, "#12151f"]} style={StyleSheet.absoluteFill} />
        <VStack maxWidth={960} w="100%" alignSelf="center" space="md">
          <Heading size="xl" fontWeight="$black" color={T.text} fontSize={titleSize} mb="$2.5">
            Menu unavailable
          </Heading>
          <Text color={T.muted}>
            The menu could not be loaded, so prices and dish names cannot be shown. Check the API and try again.
          </Text>
          <Button variant="outline" action="primary" alignSelf="flex-start" onPress={() => void loadCatalog(getApiBaseUrl())}>
            <ButtonText>Retry</ButtonText>
          </Button>
        </VStack>
      </Box>
    );
  }

  const total = cartTotal(catalog, cart);

  return (
    <Box flex={1} bg={T.bg} pt="$12" px={shell.pagePadding}>
      <LinearGradient colors={["#0a0c12", T.bg, "#12151f"]} style={StyleSheet.absoluteFill} />
      <VStack flex={1} maxWidth={960} w="100%" alignSelf="center">
        <HStack justifyContent="space-between" alignItems="flex-end" mb="$3.5">
          <VStack space="xs">
            <Text fontSize="$xs" color={T.goldDim} letterSpacing={2} textTransform="uppercase">
              Your order
            </Text>
            <Heading size="xl" fontWeight="$black" color={T.text} fontSize={titleSize}>
              Cart
            </Heading>
          </VStack>
          <VStack alignItems="flex-end" space="xs">
            <Text fontSize="$xs" color="rgba(255,255,255,0.45)">
              Total
            </Text>
            <Text fontSize="$2xl" fontWeight="$black" color={T.goldSoft}>
              {formatCatalogMoney(catalog.currency, total)}
            </Text>
          </VStack>
        </HStack>

        <HStack space="sm" mb="$3.5">
          <Button flex={1} variant="outline" action="secondary" onPress={() => undo()}>
            <ButtonText>Undo</ButtonText>
          </Button>
          <Button
            flex={1}
            variant="outline"
            action="secondary"
            borderColor="rgba(239,68,68,0.35)"
            bg="rgba(239,68,68,0.12)"
            onPress={() => clearCart()}
          >
            <ButtonText color="#fecaca">Clear</ButtonText>
          </Button>
          <Button flex={1} variant="outline" action="secondary" onPress={() => void onLogout()}>
            <ButtonText>Log out</ButtonText>
          </Button>
        </HStack>

        <ScrollView
          style={scrollViewFill()}
          showsVerticalScrollIndicator
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {cart.items.length === 0 ? (
            <VStack
              p="$7"
              borderRadius="$lg"
              borderWidth={1}
              borderColor={T.line}
              alignItems="center"
              space="sm"
              bg={T.glass}
              sx={{
                _web: {
                  boxShadow: "0 12px 36px rgba(0,0,0,0.35)",
                },
              }}
            >
              <Text fontSize="$4xl">🥂</Text>
              <Text fontSize="$md" fontWeight="$bold" color="#f3f0e6">
                Your cart is empty
              </Text>
              <Text fontSize="$sm" color={T.muted} textAlign="center" lineHeight="$md">
                Browse the menu or ask the concierge to add items in one sentence.
              </Text>
            </VStack>
          ) : (
            <VStack space="sm">
              {cart.items.map((li) => {
                const dish = catalog.dishes.find((d) => d.id === li.dishId);
                const unit = lineUnitPrice(catalog, li.dishId, li.selectedModifiers);
                const lineTotal = unit * li.qty;
                return (
                  <VStack
                    key={li.lineId}
                    p="$4"
                    borderRadius="$lg"
                    borderWidth={1}
                    borderColor={T.line}
                    bg={T.glass}
                    sx={{
                      _web: {
                        boxShadow: "0 10px 32px rgba(0,0,0,0.35)",
                      },
                    }}
                  >
                    <HStack justifyContent="space-between" space="md">
                      <VStack flex={1} space="xs" minWidth={0}>
                        <Text fontSize="$md" fontWeight="$black" color={T.text}>
                          {dish?.name ?? li.dishId}
                        </Text>
                        <Text fontSize="$xs" color="rgba(255,255,255,0.45)">
                          lineId: {li.lineId.slice(0, 8)}…
                        </Text>
                      </VStack>
                      <Text fontSize="$md" fontWeight="$black" color={T.goldSoft}>
                        {formatCatalogMoney(catalog.currency, lineTotal)}
                      </Text>
                    </HStack>

                    <Box h={1} bg={T.line} my="$3" />

                    <VStack space="xs">
                      {(dish?.modifierGroups ?? []).map((g) => {
                        const optId = li.selectedModifiers[g.id];
                        const opt = g.options.find((o) => o.id === optId);
                        return (
                          <Text key={g.id} fontSize="$sm" color={T.muted}>
                            {g.label}: <Text color="rgba(233,213,161,0.9)">{opt?.label ?? optId}</Text>
                          </Text>
                        );
                      })}
                    </VStack>

                    <HStack justifyContent="space-between" alignItems="center" mt="$2">
                      <HStack alignItems="center" space="md">
                        <Pressable
                          w={40}
                          h={40}
                          borderRadius="$sm"
                          borderWidth={1}
                          borderColor="rgba(255,255,255,0.14)"
                          bg="rgba(0,0,0,0.25)"
                          justifyContent="center"
                          alignItems="center"
                          onPress={() => setQty(li.lineId, Math.max(0, li.qty - 1))}
                        >
                          <Text color="#fff" fontSize="$xl" fontWeight="$black">
                            −
                          </Text>
                        </Pressable>
                        <Text fontSize="$lg" fontWeight="$black" color="#fff" minWidth={28} textAlign="center">
                          {li.qty}
                        </Text>
                        <Pressable
                          w={40}
                          h={40}
                          borderRadius="$sm"
                          borderWidth={1}
                          borderColor="rgba(212,175,101,0.55)"
                          bg="rgba(212,175,101,0.12)"
                          justifyContent="center"
                          alignItems="center"
                          onPress={() => setQty(li.lineId, li.qty + 1)}
                        >
                          <Text color={T.goldSoft} fontSize="$xl" fontWeight="$black">
                            +
                          </Text>
                        </Pressable>
                      </HStack>

                      <Button size="sm" variant="outline" action="secondary" onPress={() => removeLine(li.lineId)}>
                        <ButtonText>Remove</ButtonText>
                      </Button>
                    </HStack>
                  </VStack>
                );
              })}
            </VStack>
          )}
        </ScrollView>

        {cart.items.length > 0 ? (
          <Box position="absolute" left={0} right={0} bottom={84} borderRadius="$lg" overflow="hidden" h={54}>
            <Pressable flex={1} onPress={() => router.push("/checkout")}>
              <LinearGradient
                colors={[T.gold, T.goldSoft, T.gold]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
              >
                <Text fontWeight="$black" color="#1a1204" fontSize="$md">
                  Checkout preview (no payment in MVP)
                </Text>
              </LinearGradient>
            </Pressable>
          </Box>
        ) : null}
      </VStack>
    </Box>
  );
}
