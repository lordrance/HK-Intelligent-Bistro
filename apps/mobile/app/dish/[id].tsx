import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, ButtonText } from "@/components/ui";
import { useAppShell } from "@/lib/responsive";
import { lineUnitPrice } from "@/lib/pricing";
import { formatCatalogMoney } from "@/lib/formatMoney";
import { scrollViewFill } from "@/lib/scrollStyles";
import { useBistroStore } from "@/store/bistroStore";
import { T } from "@/theme/tokens";

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
      <Pressable className="flex-1 bg-black/50" onPress={() => router.back()}>
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-white">Loading dish…</Text>
          <Button variant="outline" onPress={() => router.back()}>
            <ButtonText>Back</ButtonText>
          </Button>
        </View>
      </Pressable>
    );
  }

  if (!catalog) {
    return (
      <Pressable className="flex-1 bg-black/50" onPress={() => router.back()}>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-white">Menu unavailable</Text>
          <Text className="text-center text-bistro-muted">The catalog failed to load. Go back and tap Retry on the menu tab.</Text>
          <Button variant="outline" onPress={() => router.back()}>
            <ButtonText>Back</ButtonText>
          </Button>
        </View>
      </Pressable>
    );
  }

  if (!dish) {
    return (
      <Pressable className="flex-1 bg-black/50" onPress={() => router.back()}>
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-white">Dish not found</Text>
          <Button variant="outline" onPress={() => router.back()}>
            <ButtonText>Back</ButtonText>
          </Button>
        </View>
      </Pressable>
    );
  }

  const unit = lineUnitPrice(catalog, dish.id, selected);
  const bottomPad = Math.max(insets.bottom, 16) + 8;

  return (
    <Pressable className="flex-1 bg-black/50" onPress={() => router.back()}>
      <View className="flex-1 justify-end">
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            className="w-full overflow-hidden border border-bistro-gold/35 bg-bistro-panel"
            style={{
              maxHeight: height * 0.88,
              maxWidth: shell.isWeb ? 560 : undefined,
              alignSelf: shell.isWeb ? "center" : "stretch",
              marginBottom: Platform.OS === "web" ? 24 : 0,
              borderTopLeftRadius: T.radii.sheet,
              borderTopRightRadius: T.radii.sheet,
            }}
          >
            <LinearGradient colors={["#161a24", T.panel]} style={StyleSheet.absoluteFill} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="absolute z-10 h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[rgba(8,10,16,0.72)]"
              style={{ top: Math.max(12, insets.top), right: 12 }}
              onPress={() => router.back()}
            >
              <Text className="text-lg font-bold leading-5 text-[#f3f0e6]">✕</Text>
            </Pressable>

            <ScrollView
              style={[scrollViewFill(), { maxHeight: height * 0.88 }]}
              showsVerticalScrollIndicator
              contentContainerStyle={{ paddingBottom: bottomPad }}
            >
              <View className="self-center bg-black/35" style={{ width: heroW, height: 220 }}>
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
              </View>

              <View className="gap-4 p-6">
                <View className="flex-row justify-between gap-4">
                  <View className="max-w-[70%] flex-1 gap-1">
                    <Text className="text-xs text-bistro-gold-dim">{dish.category}</Text>
                    <Text className="text-2xl font-black text-bistro-text">{dish.name}</Text>
                    <Text className="text-sm leading-6 text-bistro-muted">{dish.description}</Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-xs text-white/45">Unit preview</Text>
                    <Text className="text-2xl font-black text-bistro-gold-soft">
                      {formatCatalogMoney(catalog.currency, unit)}
                    </Text>
                  </View>
                </View>

                <View className="h-px bg-white/10" />

                {(dish.modifierGroups ?? []).map((g) => (
                  <View key={g.id} className="gap-2">
                    <Text className="text-base font-bold text-[#f3f0e6]">
                      {g.label}
                      {g.required ? <Text className="text-bistro-gold"> *</Text> : null}
                    </Text>
                    <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                      {g.options.map((o) => {
                        const active = selected[g.id] === o.id;
                        return (
                          <Pressable key={o.id} onPress={() => setSelected((prev) => ({ ...prev, [g.id]: o.id }))}>
                            <View
                              className={`rounded-md border px-3.5 py-2.5 ${
                                active ? "border-bistro-gold/85 bg-bistro-gold/15" : "border-bistro-line bg-bistro-glass"
                              }`}
                            >
                              <Text className={`font-bold ${active ? "text-bistro-gold-soft" : "text-white/75"}`}>{o.label}</Text>
                              {o.priceDelta ? (
                                <Text className="mt-0.5 text-xs text-[rgba(233,213,161,0.75)]">
                                  +{formatCatalogMoney(catalog.currency, o.priceDelta)}
                                </Text>
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}

                <Button
                  className="mt-2"
                  variant="primary"
                  disabled={!modifiersComplete}
                  style={{ opacity: modifiersComplete ? 1 : 0.45 }}
                  onPress={() => {
                    if (!modifiersComplete) return;
                    addLine({ dishId: dish.id, qty: 1, selectedModifiers: selected });
                    router.back();
                  }}
                >
                  <ButtonText variant="primary">
                    Add to cart · {formatCatalogMoney(catalog.currency, unit)}
                  </ButtonText>
                </Button>
                <Text className="text-center text-[11px] text-white/35">
                  You can refine this later in the cart or with the concierge.
                </Text>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </View>
    </Pressable>
  );
}
