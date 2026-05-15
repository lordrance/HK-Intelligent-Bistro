import { useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, type ViewProps } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { BistroScreenBackground } from "@/components/BistroScreenBackground";
import { LogOutButton } from "@/components/LogOutButton";
import { Button, ButtonText, Card } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { getApiBaseUrl } from "@/lib/api";
import { formatCatalogMoney } from "@/lib/formatMoney";
import { useAppShell } from "@/lib/responsive";
import { scrollViewFill } from "@/lib/scrollStyles";
import { useBistroStore } from "@/store/bistroStore";
import type { Dish } from "@hk/shared";
import { T } from "@/theme/tokens";

function MenuCard({ children, className }: ViewProps & { children: ReactNode; className?: string }) {
  return <Card className={className}>{children}</Card>;
}

export default function MenuScreen() {
  const router = useRouter();
  const shell = useAppShell();
  const catalog = useBistroStore((s) => s.catalog);
  const loading = useBistroStore((s) => s.catalogLoading);
  const loadCatalog = useBistroStore((s) => s.loadCatalog);
  const [q, setQ] = useState("");

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

  const pagePad = { paddingHorizontal: shell.pagePadding };

  if (loading) {
    return (
      <View className="flex-1 bg-bistro-bg pt-14" style={pagePad}>
        <BistroScreenBackground />
        <View className="w-full max-w-[960px] self-center gap-2">
          <Text className="text-xl font-black text-bistro-text">Intelligent Bistro</Text>
          <Text className="text-base text-bistro-muted">Preparing the menu…</Text>
          <View className="mt-4">
            <ActivityIndicator color="#d4af65" size="large" />
          </View>
        </View>
      </View>
    );
  }

  if (!catalog) {
    return (
      <View className="flex-1 bg-bistro-bg pt-14" style={pagePad}>
        <BistroScreenBackground />
        <View className="w-full max-w-[960px] self-center gap-4">
          <Text className="text-xl font-black text-bistro-text">Intelligent Bistro</Text>
          <Text className="max-w-md text-base leading-6 text-bistro-muted">
            We could not load the menu. Make sure the API is running and EXPO_PUBLIC_API_BASE_URL points to it (e.g.
            http://10.0.2.2:8787 on Android emulator).
          </Text>
          <Button className="self-start" variant="outline" onPress={() => void loadCatalog(getApiBaseUrl())}>
            <ButtonText>Retry</ButtonText>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bistro-bg pt-12" style={pagePad}>
      <BistroScreenBackground />
      <View className="w-full max-w-[960px] flex-1 self-center">
        <View className="mb-1.5 flex-row justify-end">
          <LogOutButton />
        </View>
        <View className="mb-4 gap-1">
          <Text className="text-xs uppercase tracking-[2px] text-bistro-gold-dim">Hong Kong · Bistro</Text>
          <Text className="font-black tracking-[-0.5px] text-bistro-text" style={{ fontSize: titleSize }}>
            What are we craving tonight?
          </Text>
          <Text className="max-w-md text-sm leading-6 text-bistro-muted">
            Tap a card to choose options, or open Concierge to steer the cart with natural language.
          </Text>
        </View>

        <MenuCard>
          <View className="flex-row items-center gap-2 px-4 py-2.5">
            <Text className="text-base text-bistro-muted">⌕</Text>
            <View className="min-h-[40px] flex-1 justify-center border-0 bg-transparent">
              <Input
                containerClassName="border-0 bg-transparent px-0 py-0"
                className="min-h-0 py-0 text-sm text-bistro-text"
                placeholder="Search dishes, aliases, or categories…"
                value={q}
                onChangeText={setQ}
              />
            </View>
          </View>
        </MenuCard>

        <ScrollView
          style={scrollViewFill()}
          showsVerticalScrollIndicator
          contentContainerStyle={{ paddingBottom: 120, paddingTop: T.space.md }}
        >
          {grouped.map(([category, dishes]) => (
            <View key={category} className="mb-6 gap-2">
              <View className="flex-row items-center gap-2 pl-1">
                <LinearGradient
                  colors={[T.gold, T.goldSoft]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ width: 36, height: 4, borderRadius: 4 }}
                />
                <Text className="text-lg font-bold text-bistro-gold-soft">{category}</Text>
              </View>

              <View className="w-full flex-row flex-wrap" style={{ gap: shell.columnGap }}>
                {dishes.map((dish) => {
                  const imgW = shell.cardWidth;
                  return (
                    <Pressable
                      key={dish.id}
                      className="mb-3.5 min-w-0 self-start"
                      style={{ width: shell.cardWidth }}
                      onPress={() => router.push(`/dish/${dish.id}`)}
                    >
                      <MenuCard>
                        <View className="min-w-0 self-stretch">
                          <View
                            className="overflow-hidden bg-black/35"
                            style={{
                              width: imgW,
                              height: 148,
                              borderTopLeftRadius: T.radii.lg,
                              borderTopRightRadius: T.radii.lg,
                            }}
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
                            <View className="absolute bottom-3 left-3.5 right-3.5 flex-row items-end justify-between gap-4">
                              <Text className="max-w-[70%] flex-1 text-lg font-black text-white" numberOfLines={2}>
                                {dish.name}
                              </Text>
                              <Text className="text-base font-black text-bistro-gold-soft">
                                {formatCatalogMoney(catalog.currency, dish.basePrice)}
                              </Text>
                            </View>
                          </View>
                          <View className="gap-1 p-4">
                            <Text className="text-sm text-bistro-muted" numberOfLines={2}>
                              {dish.description}
                            </Text>
                            <View className="flex-row items-center justify-between">
                              <Text className="text-xs text-[rgba(233,213,161,0.75)]">Tap to customize</Text>
                              <Text className="text-2xl text-bistro-gold">→</Text>
                            </View>
                          </View>
                        </View>
                      </MenuCard>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
