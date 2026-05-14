import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useBistroStore } from "../../src/store/bistroStore";
import type { Dish } from "@hk/shared";
import { useAppShell } from "../../src/lib/responsive";
import { getApiBaseUrl } from "../../src/lib/api";

const C = {
  bg: "#07080b",
  text: "#fdf8ef",
  muted: "rgba(255,255,255,0.55)",
  gold: "#c9a24d",
  goldSoft: "#f3e7c7",
  line: "rgba(255,255,255,0.08)",
  glass: "rgba(255,255,255,0.04)",
};

function GlassCard({ children }: { children: ReactNode }) {
  return <View style={styles.glass}>{children}</View>;
}

export default function MenuScreen() {
  const router = useRouter();
  const shell = useAppShell();
  const catalog = useBistroStore((s) => s.catalog);
  const loading = useBistroStore((s) => s.catalogLoading);
  const loadCatalog = useBistroStore((s) => s.loadCatalog);
  const [q, setQ] = useState("");

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
      <View style={[styles.page, { paddingTop: 56, paddingHorizontal: shell.pagePadding }]}>
        <View style={styles.shell}>
          <Text style={styles.hero}>Intelligent Bistro</Text>
          <Text style={styles.sub}>Preparing the menu…</Text>
        </View>
      </View>
    );
  }

  if (!catalog) {
    return (
      <View style={[styles.page, { paddingTop: 56, paddingHorizontal: shell.pagePadding }]}>
        <View style={styles.shell}>
          <Text style={styles.hero}>Intelligent Bistro</Text>
          <Text style={[styles.sub, { marginBottom: 16 }]}>
            We could not load the menu. Make sure the API is running and EXPO_PUBLIC_API_BASE_URL points to it (e.g.
            http://10.0.2.2:8787 on Android emulator).
          </Text>
          <Pressable
            onPress={() => void loadCatalog(getApiBaseUrl())}
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(201,162,77,0.55)",
              backgroundColor: "rgba(201,162,77,0.12)",
            }}
          >
            <Text style={{ color: "#f3e7c7", fontWeight: "800" }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.page, { paddingTop: 52, paddingHorizontal: shell.pagePadding }]}>
      <View style={styles.shell}>
        <View style={{ gap: 6, marginBottom: 14 }}>
          <Text style={styles.kicker}>Hong Kong · Bistro</Text>
          <Text style={styles.title}>What are we craving tonight?</Text>
          <Text style={styles.sub}>
            Tap a card to choose options, or open Concierge to steer the cart with natural language.
          </Text>
        </View>

      <GlassCard>
        <View style={styles.searchRow}>
          <Text style={{ color: C.muted, fontSize: 16 }}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search dishes, aliases, or categories…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={q}
            onChangeText={setQ}
          />
        </View>
      </GlassCard>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120, paddingTop: 14 }}>
        {grouped.map(([category, dishes]) => (
          <View key={category} style={{ marginBottom: 22, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 4 }}>
              <LinearGradient
                colors={[C.gold, C.goldSoft]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: 36, height: 4, borderRadius: 4 }}
              />
              <Text style={styles.catTitle}>{category}</Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: shell.columnGap,
                width: "100%",
              }}
            >
              {dishes.map((dish) => (
                <Pressable
                  key={dish.id}
                  style={{ width: shell.cardWidth, marginBottom: 14 }}
                  onPress={() => router.push(`/dish/${dish.id}`)}
                >
                  <GlassCard>
                    <View>
                      <View style={{ height: 148, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: "hidden" }}>
                        <Image
                          source={{ uri: dish.imageUrl ?? "" }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(5,6,10,0.92)"]}
                          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 88 }}
                        />
                        <View
                          style={{
                            position: "absolute",
                            left: 14,
                            right: 14,
                            bottom: 12,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: "#fff" }} numberOfLines={2}>
                            {dish.name}
                          </Text>
                          <Text style={{ fontSize: 16, fontWeight: "800", color: C.goldSoft }}>
                            {catalog.currency} {dish.basePrice}
                          </Text>
                        </View>
                      </View>
                      <View style={{ padding: 14, gap: 8 }}>
                        <Text style={{ fontSize: 13, color: C.muted }} numberOfLines={2}>
                          {dish.description}
                        </Text>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={{ fontSize: 12, color: "rgba(233,213,161,0.75)" }}>Tap to customize</Text>
                          <Text style={{ fontSize: 20, color: C.gold }}>→</Text>
                        </View>
                      </View>
                    </View>
                  </GlassCard>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  shell: { width: "100%", maxWidth: 960, alignSelf: "center" },
  hero: { fontSize: 28, fontWeight: "800", color: C.text },
  title: { fontSize: 30, fontWeight: "900", color: C.text, letterSpacing: -0.5 },
  kicker: { fontSize: 12, color: "rgba(233,213,161,0.85)", letterSpacing: 2 },
  sub: { fontSize: 14, color: C.muted, maxWidth: 360, lineHeight: 20 },
  catTitle: { fontSize: 18, fontWeight: "800", color: C.goldSoft },
  glass: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.glass,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: { flex: 1, color: "#f3f0e6", fontSize: 15, paddingVertical: 4 },
});
