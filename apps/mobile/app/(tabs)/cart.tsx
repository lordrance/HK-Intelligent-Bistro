import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useBistroStore } from "../../src/store/bistroStore";
import { cartTotal, lineUnitPrice } from "../../src/lib/pricing";

const C = {
  bg: "#07080b",
  text: "#fdf8ef",
  muted: "rgba(255,255,255,0.55)",
  gold: "#c9a24d",
  goldSoft: "#f3e7c7",
  line: "rgba(255,255,255,0.08)",
  glass: "rgba(255,255,255,0.04)",
};

export default function CartScreen() {
  const catalog = useBistroStore((s) => s.catalog);
  const cart = useBistroStore((s) => s.cart);
  const setQty = useBistroStore((s) => s.setLineQty);
  const removeLine = useBistroStore((s) => s.removeLine);
  const clearCart = useBistroStore((s) => s.clearCart);
  const undo = useBistroStore((s) => s.undo);

  if (!catalog) {
    return (
      <View style={[styles.page, { paddingTop: 56 }]}>
        <Text style={{ color: C.muted }}>购物车加载中…</Text>
      </View>
    );
  }

  const total = cartTotal(catalog, cart);

  return (
    <View style={[styles.page, { paddingTop: 52 }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={styles.kicker}>Your Order</Text>
          <Text style={styles.title}>购物车</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>合计</Text>
          <Text style={{ fontSize: 24, fontWeight: "900", color: C.goldSoft }}>
            {catalog.currency} {total}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        <Pressable style={[styles.toolBtn, { flex: 1 }]} onPress={() => undo()}>
          <Text style={{ color: "#f3f0e6", fontWeight: "800", textAlign: "center" }}>撤销上一步</Text>
        </Pressable>
        <Pressable style={[styles.toolBtn, styles.dangerBtn]} onPress={() => clearCart()}>
          <Text style={{ color: "#fecaca", fontWeight: "800", textAlign: "center" }}>清空</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {cart.items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>🥂</Text>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#f3f0e6" }}>还没有选择餐品</Text>
            <Text style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 }}>
              去菜单挑选，或让 AI 助手用一句话帮你加购。
            </Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {cart.items.map((li) => {
              const dish = catalog.dishes.find((d) => d.id === li.dishId);
              const unit = lineUnitPrice(catalog, li.dishId, li.selectedModifiers);
              const lineTotal = unit * li.qty;
              return (
                <View key={li.lineId} style={styles.card}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={{ fontSize: 17, fontWeight: "900", color: C.text }}>{dish?.name ?? li.dishId}</Text>
                      <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                        lineId: {li.lineId.slice(0, 8)}…
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: C.goldSoft }}>
                      {catalog.currency} {lineTotal}
                    </Text>
                  </View>

                  <View style={{ height: 1, backgroundColor: C.line, marginVertical: 12 }} />

                  <View style={{ gap: 6 }}>
                    {(dish?.modifierGroups ?? []).map((g) => {
                      const optId = li.selectedModifiers[g.id];
                      const opt = g.options.find((o) => o.id === optId);
                      return (
                        <Text key={g.id} style={{ fontSize: 13, color: C.muted }}>
                          {g.label}：<Text style={{ color: "rgba(233,213,161,0.9)" }}>{opt?.label ?? optId}</Text>
                        </Text>
                      );
                    })}
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Pressable onPress={() => setQty(li.lineId, Math.max(0, li.qty - 1))} style={styles.step}>
                        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>−</Text>
                      </Pressable>
                      <Text style={{ fontSize: 18, fontWeight: "900", color: "#fff", minWidth: 28, textAlign: "center" }}>
                        {li.qty}
                      </Text>
                      <Pressable onPress={() => setQty(li.lineId, li.qty + 1)} style={[styles.step, styles.stepPlus]}>
                        <Text style={{ color: C.goldSoft, fontSize: 20, fontWeight: "800" }}>+</Text>
                      </Pressable>
                    </View>

                    <Pressable onPress={() => removeLine(li.lineId)} style={styles.delBtn}>
                      <Text style={{ color: "rgba(255,255,255,0.65)", fontWeight: "800" }}>删除</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {cart.items.length > 0 ? (
        <View style={styles.checkoutWrap}>
          <LinearGradient
            colors={[C.gold, C.goldSoft, C.gold]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.checkout}
          >
            <Text style={{ fontWeight: "900", color: "#1a1204", fontSize: 16 }}>预览结账（MVP 不接支付）</Text>
          </LinearGradient>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 18, backgroundColor: C.bg },
  kicker: { fontSize: 12, color: "rgba(233,213,161,0.85)", letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: "900", color: C.text },
  toolBtn: {
    borderRadius: 14,
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 12,
  },
  dangerBtn: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.35)",
  },
  empty: {
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    gap: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.glass,
    padding: 16,
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  stepPlus: {
    borderColor: "rgba(201,162,77,0.55)",
    backgroundColor: "rgba(201,162,77,0.12)",
  },
  delBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  checkoutWrap: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 84,
    borderRadius: 18,
    overflow: "hidden",
    height: 54,
  },
  checkout: { flex: 1, alignItems: "center", justifyContent: "center" },
});
