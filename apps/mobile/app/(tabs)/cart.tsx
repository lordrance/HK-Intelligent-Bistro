import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { BistroScreenBackground } from "@/components/BistroScreenBackground";
import { LogOutButton } from "@/components/LogOutButton";
import { Button, ButtonText } from "@/components/ui";
import { getApiBaseUrl } from "@/lib/api";
import { cartTotal, lineUnitPrice } from "@/lib/pricing";
import { formatCatalogMoney } from "@/lib/formatMoney";
import { useAppShell } from "@/lib/responsive";
import { scrollViewFill } from "@/lib/scrollStyles";
import { useBistroStore } from "@/store/bistroStore";
import { T } from "@/theme/tokens";

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

  const titleSize = shell.compactWeb ? T.titlePageCompact : T.titlePage;
  const pagePad = { paddingHorizontal: shell.pagePadding };

  if (catalogLoading) {
    return (
      <View className="flex-1 bg-bistro-bg pt-14" style={pagePad}>
        <BistroScreenBackground />
        <View className="w-full max-w-[960px] self-center">
          <Text className="text-bistro-muted">Loading cart…</Text>
        </View>
      </View>
    );
  }

  if (!catalog) {
    return (
      <View className="flex-1 bg-bistro-bg pt-14" style={pagePad}>
        <BistroScreenBackground />
        <View className="w-full max-w-[960px] self-center gap-4">
          <Text className="mb-2.5 font-black text-bistro-text" style={{ fontSize: titleSize }}>
            Menu unavailable
          </Text>
          <Text className="text-bistro-muted">
            The menu could not be loaded, so prices and dish names cannot be shown. Check the API and try again.
          </Text>
          <Button className="self-start" variant="outline" onPress={() => void loadCatalog(getApiBaseUrl())}>
            <ButtonText>Retry</ButtonText>
          </Button>
        </View>
      </View>
    );
  }

  const total = cartTotal(catalog, cart);

  return (
    <View className="flex-1 bg-bistro-bg pt-12" style={pagePad}>
      <BistroScreenBackground />
      <View className="w-full max-w-[960px] flex-1 self-center">
        <View className="mb-1.5 flex-row justify-end">
          <LogOutButton />
        </View>
        <View className="mb-3.5 flex-row items-end justify-between">
          <View className="gap-1">
            <Text className="text-xs uppercase tracking-[2px] text-bistro-gold-dim">Your order</Text>
            <Text className="font-black text-bistro-text" style={{ fontSize: titleSize }}>
              Cart
            </Text>
          </View>
          <View className="items-end gap-1">
            <Text className="text-xs text-white/45">Total</Text>
            <Text className="text-2xl font-black text-bistro-gold-soft">{formatCatalogMoney(catalog.currency, total)}</Text>
          </View>
        </View>

        <View className="mb-3.5 flex-row gap-2">
          <Button className="flex-1" variant="outline" onPress={() => undo()}>
            <ButtonText>Undo</ButtonText>
          </Button>
          <Button className="flex-1" variant="destructive" onPress={() => clearCart()}>
            <ButtonText variant="destructive">Clear</ButtonText>
          </Button>
        </View>

        <ScrollView
          style={scrollViewFill()}
          showsVerticalScrollIndicator={cart.items.length > 0}
          contentContainerStyle={{ paddingBottom: 120, flexGrow: cart.items.length === 0 ? 1 : undefined }}
        >
          {cart.items.length === 0 ? (
            <View className="items-center gap-2 rounded-bistro border border-bistro-line bg-bistro-glass p-7">
              <Text className="text-4xl">🥂</Text>
              <Text className="text-base font-bold text-[#f3f0e6]">Your cart is empty</Text>
              <Text className="text-center text-sm leading-6 text-bistro-muted">
                Browse the menu or ask the concierge to add items in one sentence.
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {cart.items.map((li) => {
                const dish = catalog.dishes.find((d) => d.id === li.dishId);
                const unit = lineUnitPrice(catalog, li.dishId, li.selectedModifiers);
                const lineTotal = unit * li.qty;
                return (
                  <View key={li.lineId} className="gap-0 rounded-bistro border border-bistro-line bg-bistro-glass p-4">
                    <View className="flex-row justify-between gap-4">
                      <View className="max-w-[70%] flex-1 gap-1">
                        <Text className="text-base font-black text-bistro-text">{dish?.name ?? li.dishId}</Text>
                        <Text className="text-xs text-white/45">lineId: {li.lineId.slice(0, 8)}…</Text>
                      </View>
                      <Text className="text-base font-black text-bistro-gold-soft">
                        {formatCatalogMoney(catalog.currency, lineTotal)}
                      </Text>
                    </View>

                    <View className="my-3 h-px bg-bistro-line" />

                    <View className="gap-1">
                      {(dish?.modifierGroups ?? []).map((g) => {
                        const optId = li.selectedModifiers[g.id];
                        const opt = g.options.find((o) => o.id === optId);
                        return (
                          <Text key={g.id} className="text-sm text-bistro-muted">
                            {g.label}: <Text className="text-[rgba(233,213,161,0.9)]">{opt?.label ?? optId}</Text>
                          </Text>
                        );
                      })}
                    </View>

                    <View className="mt-2 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-4">
                        <Pressable
                          className="h-10 w-10 items-center justify-center rounded-sm border border-white/15 bg-black/25"
                          onPress={() => setQty(li.lineId, Math.max(0, li.qty - 1))}
                        >
                          <Text className="text-xl font-black text-white">−</Text>
                        </Pressable>
                        <Text className="min-w-[28px] text-center text-lg font-black text-white">{li.qty}</Text>
                        <Pressable
                          className="h-10 w-10 items-center justify-center rounded-sm border border-bistro-gold/55 bg-bistro-gold/15"
                          onPress={() => setQty(li.lineId, li.qty + 1)}
                        >
                          <Text className="text-xl font-black text-bistro-gold-soft">+</Text>
                        </Pressable>
                      </View>

                      <Button variant="outline" size="sm" onPress={() => removeLine(li.lineId)}>
                        <ButtonText className="text-xs">Remove</ButtonText>
                      </Button>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {cart.items.length > 0 ? (
          <View
            pointerEvents="box-none"
            className="absolute bottom-[84px]"
            style={{ left: shell.pagePadding, right: shell.pagePadding }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Checkout"
              onPress={() => router.push("/checkout")}
              className="self-center overflow-hidden rounded-bistro"
              style={{ maxWidth: 420, width: "100%" }}
            >
              <LinearGradient
                colors={[T.gold, T.goldSoft, T.gold]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ height: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}
              >
                <Text className="text-sm font-black text-[#1a1204]" numberOfLines={1}>
                  Checkout
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
