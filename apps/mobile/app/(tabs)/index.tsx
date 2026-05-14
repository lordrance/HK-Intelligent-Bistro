import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import {
  Box,
  Button,
  ButtonText,
  Card,
  Heading,
  HStack,
  Input,
  InputField,
  Pressable,
  ScrollView,
  Spinner,
  Text,
  VStack,
} from "@gluestack-ui/themed";
import { useAuthStore } from "../../src/store/authStore";
import { useBistroStore } from "../../src/store/bistroStore";
import type { Dish } from "@hk/shared";
import { useAppShell } from "../../src/lib/responsive";
import { getApiBaseUrl } from "../../src/lib/api";
import { scrollViewFill } from "../../src/lib/scrollStyles";
import { formatCatalogMoney } from "../../src/lib/formatMoney";
import { T } from "../../src/theme/tokens";

function MenuCard({ children }: { children: ReactNode }) {
  return (
    <Card
      borderRadius="$lg"
      borderWidth={1}
      borderColor="rgba(255,255,255,0.1)"
      bg="rgba(255,255,255,0.06)"
      overflow="hidden"
      sx={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.4,
        shadowRadius: 28,
        elevation: 14,
        _web: { boxShadow: "0 18px 48px rgba(0,0,0,0.45)" },
      }}
    >
      {children}
    </Card>
  );
}

export default function MenuScreen() {
  const router = useRouter();
  const shell = useAppShell();
  const catalog = useBistroStore((s) => s.catalog);
  const loading = useBistroStore((s) => s.catalogLoading);
  const loadCatalog = useBistroStore((s) => s.loadCatalog);
  const resetAfterLogout = useBistroStore((s) => s.resetAfterLogout);
  const [q, setQ] = useState("");

  async function onLogout() {
    await useAuthStore.getState().clearSession();
    resetAfterLogout();
    router.replace("/login");
  }

  const titleSize = shell.compactWeb ? T.titlePageCompact : T.titlePage;

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const s = q.trim().toLowerCase();
    if (!s) return catalog.dishes;
    return catalog.dishes.filter(
      (d) =>
        d.name.toLowerCase().includes(s) ||
        d.category.toLowerCase().includes(s) ||
        (d.aliases ?? []).some((a) => a.toLowerCase().includes(s)),
    );
  }, [catalog, q]);

  const grouped = useMemo(() => {
    const m = new Map<string, Dish[]>();
    for (const d of filtered) {
      const arr = m.get(d.category) ?? [];
      arr.push(d);
      m.set(d.category, arr);
    }
    return [...m.entries()];
  }, [filtered]);

  if (loading) {
    return (
      <Box flex={1} bg={T.bg} pt={56} px={shell.pagePadding}>
        <LinearGradient colors={["#0a0c12", T.bg, "#12151f"]} style={StyleSheet.absoluteFill} />
        <VStack maxWidth={960} w="100%" alignSelf="center" space="sm">
          <Heading size="xl" color={T.text}>
            Intelligent Bistro
          </Heading>
          <Text color={T.muted} fontSize="$md">
            Preparing the menu…
          </Text>
          <Spinner size="large" color="$primary400" mt="$4" />
        </VStack>
      </Box>
    );
  }

  if (!catalog) {
    return (
      <Box flex={1} bg={T.bg} pt={56} px={shell.pagePadding}>
        <LinearGradient colors={["#0a0c12", T.bg, "#12151f"]} style={StyleSheet.absoluteFill} />
        <VStack maxWidth={960} w="100%" alignSelf="center" space="md">
          <Heading size="xl" color={T.text}>
            Intelligent Bistro
          </Heading>
          <Text color={T.muted} fontSize="$md" maxWidth={420} lineHeight="$md">
            We could not load the menu. Make sure the API is running and EXPO_PUBLIC_API_BASE_URL points to it (e.g.
            http://10.0.2.2:8787 on Android emulator).
          </Text>
          <Button
            variant="outline"
            action="primary"
            alignSelf="flex-start"
            onPress={() => void loadCatalog(getApiBaseUrl())}
          >
            <ButtonText>Retry</ButtonText>
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box flex={1} bg={T.bg} pt="$12" px={shell.pagePadding}>
      <LinearGradient colors={["#0a0c12", T.bg, "#12151f"]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(212,175,101,0.12)", "transparent", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.45 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <VStack flex={1} maxWidth={960} w="100%" alignSelf="center">
        <HStack justifyContent="flex-end" mb="$1.5">
          <Button size="sm" variant="outline" action="secondary" onPress={() => void onLogout()}>
            <ButtonText fontSize="$xs" fontWeight="$bold">
              Log out
            </ButtonText>
          </Button>
        </HStack>
        <VStack space="xs" mb="$4">
          <Text fontSize="$xs" letterSpacing={2} color={T.goldDim} textTransform="uppercase">
            Hong Kong · Bistro
          </Text>
          <Heading size="xl" fontWeight="$black" letterSpacing={-0.5} color={T.text} fontSize={titleSize}>
            What are we craving tonight?
          </Heading>
          <Text color={T.muted} fontSize="$sm" maxWidth={420} lineHeight="$md">
            Tap a card to choose options, or open Concierge to steer the cart with natural language.
          </Text>
        </VStack>

        <MenuCard>
          <HStack alignItems="center" px="$4" py="$2.5" space="sm">
            <Text color={T.muted} fontSize="$md">
              ⌕
            </Text>
            <Input flex={1} variant="outline" size="sm" borderWidth={0} bg="transparent">
              <InputField
                placeholder="Search dishes, aliases, or categories…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={q}
                onChangeText={setQ}
                color={T.text}
                fontSize="$sm"
              />
            </Input>
          </HStack>
        </MenuCard>

        <ScrollView
          style={scrollViewFill()}
          showsVerticalScrollIndicator
          contentContainerStyle={{ paddingBottom: 120, paddingTop: T.space.md }}
        >
          {grouped.map(([category, dishes]) => (
            <VStack key={category} mb="$6" space="sm">
              <HStack alignItems="center" space="sm" pl="$1">
                <LinearGradient
                  colors={[T.gold, T.goldSoft]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ width: 36, height: 4, borderRadius: 4 }}
                />
                <Text fontSize="$lg" fontWeight="$bold" color={T.goldSoft}>
                  {category}
                </Text>
              </HStack>

              <Box flexDirection="row" flexWrap="wrap" style={{ gap: shell.columnGap, width: "100%" }}>
                {dishes.map((dish) => {
                  const imgW = shell.cardWidth;
                  return (
                    <Pressable
                      key={dish.id}
                      width={shell.cardWidth}
                      mb="$3.5"
                      minWidth={0}
                      alignSelf="flex-start"
                      onPress={() => router.push(`/dish/${dish.id}`)}
                    >
                      <MenuCard>
                        <Box minWidth={0} alignSelf="stretch">
                          <Box
                            width={imgW}
                            height={148}
                            borderTopLeftRadius={T.radii.lg}
                            borderTopRightRadius={T.radii.lg}
                            overflow="hidden"
                            bg="rgba(0,0,0,0.35)"
                          >
                            <Image
                              source={{ uri: dish.imageUrl ?? "" }}
                              style={{ width: imgW, height: 148 }}
                              contentFit="cover"
                              transition={200}
                            />
                            <LinearGradient
                              colors={["transparent", "rgba(5,6,10,0.92)"]}
                              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 88 }}
                            />
                            <HStack
                              position="absolute"
                              left={14}
                              right={14}
                              bottom={12}
                              justifyContent="space-between"
                              alignItems="flex-end"
                              space="md"
                            >
                              <Text flex={1} fontSize="$lg" fontWeight="$black" color="#fff" numberOfLines={2}>
                                {dish.name}
                              </Text>
                              <Text fontSize="$md" fontWeight="$black" color={T.goldSoft}>
                                {formatCatalogMoney(catalog.currency, dish.basePrice)}
                              </Text>
                            </HStack>
                          </Box>
                          <VStack p="$4" space="xs">
                            <Text fontSize="$sm" color={T.muted} numberOfLines={2}>
                              {dish.description}
                            </Text>
                            <HStack justifyContent="space-between" alignItems="center">
                              <Text fontSize="$xs" color="rgba(233,213,161,0.75)">
                                Tap to customize
                              </Text>
                              <Text fontSize="$2xl" color={T.gold}>
                                →
                              </Text>
                            </HStack>
                          </VStack>
                        </Box>
                      </MenuCard>
                    </Pressable>
                  );
                })}
              </Box>
            </VStack>
          ))}
        </ScrollView>
      </VStack>
    </Box>
  );
}
