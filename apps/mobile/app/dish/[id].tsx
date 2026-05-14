import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Box,
  Button,
  ButtonText,
  Heading,
  HStack,
  Pressable,
  ScrollView,
  Text,
  VStack,
} from "@gluestack-ui/themed";
import { useBistroStore } from "../../src/store/bistroStore";
import { lineUnitPrice } from "../../src/lib/pricing";
import { useAppShell } from "../../src/lib/responsive";
import { scrollViewFill } from "../../src/lib/scrollStyles";
import { formatCatalogMoney } from "../../src/lib/formatMoney";
import { T } from "../../src/theme/tokens";

export default function DishDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const shell = useAppShell();
  const insets = useSafeAreaInsets();
  const catalog = useBistroStore((s) => s.catalog);
  const catalogLoading = useBistroStore((s) => s.catalogLoading);
  const addLine = useBistroStore((s) => s.addLineFromMenu);
  const { height, width } = useWindowDimensions();

  const dish = useMemo(() => catalog?.dishes.find((d) => d.id === id), [catalog, id]);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const sheetMaxW = shell.isWeb ? Math.min(560, shell.innerWidth) : width;
  const heroW = sheetMaxW;

  const modifiersComplete = useMemo(() => {
    if (!dish) return false;
    for (const g of dish.modifierGroups ?? []) {
      if (g.required && !selected[g.id]) return false;
    }
    return true;
  }, [dish, selected]);

  useEffect(() => {
    if (!dish) return;
    const m: Record<string, string> = {};
    for (const g of dish.modifierGroups ?? []) {
      const first = g.options[0];
      if (first) m[g.id] = first.id;
    }
    setSelected(m);
  }, [dish?.id]);

  if (catalogLoading) {
    return (
      <Pressable flex={1} bg="rgba(0,0,0,0.5)" onPress={() => router.back()}>
        <VStack flex={1} justifyContent="center" alignItems="center" space="md">
          <Text color="#fff">Loading dish…</Text>
          <Button variant="outline" action="primary" onPress={() => router.back()}>
            <ButtonText>Back</ButtonText>
          </Button>
        </VStack>
      </Pressable>
    );
  }

  if (!catalog) {
    return (
      <Pressable flex={1} bg="rgba(0,0,0,0.5)" onPress={() => router.back()}>
        <VStack flex={1} justifyContent="center" alignItems="center" space="md" px="$6">
          <Text color="#fff">Menu unavailable</Text>
          <Text color={T.muted} textAlign="center">
            The catalog failed to load. Go back and tap Retry on the menu tab.
          </Text>
          <Button variant="outline" action="primary" onPress={() => router.back()}>
            <ButtonText>Back</ButtonText>
          </Button>
        </VStack>
      </Pressable>
    );
  }

  if (!dish) {
    return (
      <Pressable flex={1} bg="rgba(0,0,0,0.5)" onPress={() => router.back()}>
        <VStack flex={1} justifyContent="center" alignItems="center" space="md">
          <Text color="#fff">Dish not found</Text>
          <Button variant="outline" action="primary" onPress={() => router.back()}>
            <ButtonText>Back</ButtonText>
          </Button>
        </VStack>
      </Pressable>
    );
  }

  const unit = lineUnitPrice(catalog, dish.id, selected);
  const bottomPad = Math.max(insets.bottom, 16) + 8;

  return (
    <Pressable flex={1} bg="rgba(0,0,0,0.5)" onPress={() => router.back()}>
      <Box flex={1} justifyContent="flex-end">
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Box
            maxHeight={height * 0.88}
            w={shell.isWeb ? "100%" : "100%"}
            maxWidth={shell.isWeb ? 560 : undefined}
            alignSelf={shell.isWeb ? "center" : "stretch"}
            mb={Platform.OS === "web" ? "$6" : 0}
            borderTopLeftRadius={T.radii.sheet}
            borderTopRightRadius={T.radii.sheet}
            overflow="hidden"
            borderWidth={1}
            borderColor="rgba(212,175,101,0.35)"
            bg={T.panel}
          >
            <LinearGradient colors={["#161a24", T.panel]} style={StyleSheet.absoluteFill} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              position="absolute"
              zIndex={10}
              w={40}
              h={40}
              borderRadius="$full"
              top={Math.max(12, insets.top)}
              right={12}
              bg="rgba(8,10,16,0.72)"
              borderWidth={1}
              borderColor="rgba(255,255,255,0.18)"
              justifyContent="center"
              alignItems="center"
              onPress={() => router.back()}
            >
              <Text color="#f3f0e6" fontSize="$lg" fontWeight="$bold" lineHeight={20}>
                ✕
              </Text>
            </Pressable>

            <ScrollView
              style={[scrollViewFill(), { maxHeight: height * 0.88 }]}
              showsVerticalScrollIndicator
              contentContainerStyle={{ paddingBottom: bottomPad }}
            >
              <Box w={heroW} h={220} alignSelf="center" bg="rgba(0,0,0,0.35)">
                <Image
                  source={{ uri: dish.imageUrl ?? "" }}
                  style={{ width: heroW, height: 220 }}
                  contentFit="cover"
                  transition={200}
                />
                <LinearGradient
                  colors={["transparent", T.panel]}
                  style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120 }}
                />
              </Box>

              <VStack p="$6" space="md">
                <HStack justifyContent="space-between" space="md">
                  <VStack flex={1} space="xs" minWidth={0}>
                    <Text fontSize="$xs" color={T.goldDim}>
                      {dish.category}
                    </Text>
                    <Heading size="xl" fontWeight="$black" color={T.text}>
                      {dish.name}
                    </Heading>
                    <Text fontSize="$sm" color={T.muted} lineHeight="$md">
                      {dish.description}
                    </Text>
                  </VStack>
                  <VStack alignItems="flex-end" space="xs">
                    <Text fontSize="$xs" color="rgba(255,255,255,0.45)">
                      Unit preview
                    </Text>
                    <Text fontSize="$2xl" fontWeight="$black" color={T.goldSoft}>
                      {formatCatalogMoney(catalog.currency, unit)}
                    </Text>
                  </VStack>
                </HStack>

                <Box h={1} bg="rgba(255,255,255,0.08)" />

                {(dish.modifierGroups ?? []).map((g) => (
                  <VStack key={g.id} space="sm">
                    <Text fontSize="$md" fontWeight="$bold" color="#f3f0e6">
                      {g.label}
                      {g.required ? <Text color={T.gold}> *</Text> : null}
                    </Text>
                    <Box flexDirection="row" flexWrap="wrap" style={{ gap: 10 }}>
                      {g.options.map((o) => {
                        const active = selected[g.id] === o.id;
                        return (
                          <Pressable key={o.id} onPress={() => setSelected((prev) => ({ ...prev, [g.id]: o.id }))}>
                            <Box
                              px="$3.5"
                              py="$2.5"
                              borderRadius="$md"
                              borderWidth={1}
                              borderColor={active ? "rgba(212,175,101,0.85)" : T.line}
                              bg={active ? "rgba(212,175,101,0.12)" : T.glass}
                            >
                              <Text color={active ? T.goldSoft : "rgba(255,255,255,0.75)"} fontWeight="$bold">
                                {o.label}
                              </Text>
                              {o.priceDelta ? (
                                <Text fontSize="$xs" color="rgba(233,213,161,0.75)" mt="$0.5">
                                  +{formatCatalogMoney(catalog.currency, o.priceDelta)}
                                </Text>
                              ) : null}
                            </Box>
                          </Pressable>
                        );
                      })}
                    </Box>
                  </VStack>
                ))}

                <Button
                  mt="$2"
                  action="primary"
                  isDisabled={!modifiersComplete}
                  opacity={modifiersComplete ? 1 : 0.45}
                  onPress={() => {
                    if (!modifiersComplete) return;
                    addLine({ dishId: dish.id, qty: 1, selectedModifiers: selected });
                    router.back();
                  }}
                >
                  <ButtonText>
                    Add to cart · {formatCatalogMoney(catalog.currency, unit)}
                  </ButtonText>
                </Button>
                <Text fontSize={11} color="rgba(255,255,255,0.35)" textAlign="center">
                  You can refine this later in the cart or with the concierge.
                </Text>
              </VStack>
            </ScrollView>
          </Box>
        </Pressable>
      </Box>
    </Pressable>
  );
}
