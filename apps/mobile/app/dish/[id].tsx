import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, Platform } from "react-native";
import { useBistroStore } from "../../src/store/bistroStore";
import { lineUnitPrice } from "../../src/lib/pricing";
import { useAppShell } from "../../src/lib/responsive";

const C = {
  panel: "#0c0e14",
  text: "#fdf8ef",
  muted: "rgba(255,255,255,0.55)",
  gold: "#c9a24d",
  goldSoft: "#f3e7c7",
  line: "rgba(255,255,255,0.1)",
};

export default function DishDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const shell = useAppShell();
  const catalog = useBistroStore((s) => s.catalog);
  const catalogLoading = useBistroStore((s) => s.catalogLoading);
  const addLine = useBistroStore((s) => s.addLineFromMenu);
  const { height } = useWindowDimensions();

  const dish = useMemo(() => catalog?.dishes.find((d) => d.id === id), [catalog, id]);
  const [selected, setSelected] = useState<Record<string, string>>({});

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
      <Pressable style={styles.backdrop} onPress={() => router.back()}>
        <View style={styles.centerBox}>
          <Text style={{ color: "#fff" }}>Loading dish…</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: C.goldSoft, fontWeight: "800" }}>Back</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  if (!catalog) {
    return (
      <Pressable style={styles.backdrop} onPress={() => router.back()}>
        <View style={styles.centerBox}>
          <Text style={{ color: "#fff" }}>Menu unavailable</Text>
          <Text style={{ color: C.muted, marginTop: 8, textAlign: "center" }}>
            The catalog failed to load. Go back and tap Retry on the menu tab.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: C.goldSoft, fontWeight: "800" }}>Back</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  if (!dish) {
    return (
      <Pressable style={styles.backdrop} onPress={() => router.back()}>
        <View style={styles.centerBox}>
          <Text style={{ color: "#fff" }}>Dish not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: C.goldSoft, fontWeight: "800" }}>Back</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  const unit = lineUnitPrice(catalog, dish.id, selected);

  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.sheet,
              { maxHeight: height * 0.88 },
              shell.isWeb ? { maxWidth: 560, width: "100%", alignSelf: "center", marginBottom: Platform.OS === "web" ? 24 : 0 } : null,
            ]}
          >
            <LinearGradient colors={["#161a24", C.panel]} style={StyleSheet.absoluteFill} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ height: 220, width: "100%" }}>
                <Image source={{ uri: dish.imageUrl ?? "" }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                <LinearGradient
                  colors={["transparent", C.panel]}
                  style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120 }}
                />
              </View>

              <View style={{ padding: 20, gap: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ fontSize: 12, color: "rgba(233,213,161,0.85)" }}>{dish.category}</Text>
                    <Text style={{ fontSize: 26, fontWeight: "900", color: C.text }}>{dish.name}</Text>
                    <Text style={{ fontSize: 14, color: C.muted, lineHeight: 20 }}>{dish.description}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Unit preview</Text>
                    <Text style={{ fontSize: 22, fontWeight: "900", color: C.goldSoft }}>
                      {catalog.currency} {unit}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />

                {(dish.modifierGroups ?? []).map((g) => (
                  <View key={g.id} style={{ gap: 10 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#f3f0e6" }}>
                      {g.label}
                      {g.required ? <Text style={{ color: C.gold }}> *</Text> : null}
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                      {g.options.map((o) => {
                        const active = selected[g.id] === o.id;
                        return (
                          <Pressable key={o.id} onPress={() => setSelected((prev) => ({ ...prev, [g.id]: o.id }))}>
                            <View
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: active ? "rgba(201,162,77,0.85)" : C.line,
                                backgroundColor: active ? "rgba(201,162,77,0.12)" : "rgba(255,255,255,0.04)",
                              }}
                            >
                              <Text style={{ color: active ? C.goldSoft : "rgba(255,255,255,0.75)", fontWeight: "700" }}>
                                {o.label}
                              </Text>
                              {o.priceDelta ? (
                                <Text style={{ fontSize: 12, color: "rgba(233,213,161,0.75)", marginTop: 2 }}>
                                  +{catalog.currency} {o.priceDelta}
                                </Text>
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}

                <Pressable
                  onPress={() => {
                    if (!modifiersComplete) return;
                    addLine({ dishId: dish.id, qty: 1, selectedModifiers: selected });
                    router.back();
                  }}
                  disabled={!modifiersComplete}
                  style={{ marginTop: 8, opacity: modifiersComplete ? 1 : 0.45 }}
                >
                  <LinearGradient
                    colors={[C.gold, C.goldSoft, C.gold]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
                  >
                    <Text style={{ color: "#1a1204", fontWeight: "900", fontSize: 16 }}>
                      Add to cart · {catalog.currency} {unit}
                    </Text>
                  </LinearGradient>
                </Pressable>
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
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

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(201,162,77,0.35)",
    backgroundColor: "#0c0e14",
  },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
});
