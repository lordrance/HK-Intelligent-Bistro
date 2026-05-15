import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cartTotal } from "@/lib/pricing";
import { formatCatalogMoney } from "@/lib/formatMoney";
import { scrollViewFill } from "@/lib/scrollStyles";
import { useBistroStore } from "@/store/bistroStore";
import { T } from "@/theme/tokens";

type Step = "form" | "done";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function formatCardDisplay(digits: string): string {
  const chunks = digits.match(/.{1,4}/g);
  return chunks ? chunks.join(" ") : digits;
}

function validateExpiry(mmyy: string): string | null {
  const d = digitsOnly(mmyy);
  if (d.length !== 4) return "Enter expiry as MMYY (4 digits).";
  const mm = Number(d.slice(0, 2));
  const yy = Number(d.slice(2, 4));
  if (mm < 1 || mm > 12) return "Invalid month.";
  const fullYear = 2000 + yy;
  const now = new Date();
  const expEnd = new Date(fullYear, mm, 0, 23, 59, 59);
  if (expEnd < now) return "Card appears expired.";
  return null;
}

const inputClass =
  "rounded-md border border-bistro-line bg-black/35 px-3.5 py-3 text-base text-bistro-text";

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const catalog = useBistroStore((s) => s.catalog);
  const cart = useBistroStore((s) => s.cart);
  const clearCart = useBistroStore((s) => s.clearCart);

  const [step, setStep] = useState<Step>("form");
  const [cardDigits, setCardDigits] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(() => (catalog ? cartTotal(catalog, cart) : 0), [catalog, cart]);

  const leaveIfEmpty = useCallback(() => {
    if (!catalog || cart.items.length === 0) {
      router.back();
    }
  }, [catalog, cart.items.length, router]);

  useEffect(() => {
    leaveIfEmpty();
  }, [leaveIfEmpty]);

  const onChangeCard = (text: string) => {
    const d = digitsOnly(text).slice(0, 19);
    setCardDigits(d);
    setError(null);
  };

  const onChangeExpiry = (text: string) => {
    const d = digitsOnly(text).slice(0, 4);
    if (d.length <= 2) setExpiry(d);
    else setExpiry(`${d.slice(0, 2)}/${d.slice(2)}`);
    setError(null);
  };

  const onChangeCvv = (text: string) => {
    setCvv(digitsOnly(text).slice(0, 4));
    setError(null);
  };

  const validateForm = (): string | null => {
    if (cardDigits.length < 13) return "Card number must be at least 13 digits.";
    const expErr = validateExpiry(expiry);
    if (expErr) return expErr;
    if (cvv.length < 3 || cvv.length > 4) return "CVV must be 3 or 4 digits.";
    if (!nameOnCard.trim()) return "Enter the name on card.";
    return null;
  };

  const onSubmit = () => {
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    setTimeout(() => {
      setSubmitting(false);
      setStep("done");
    }, 900);
  };

  const onBackToCart = () => {
    clearCart();
    router.back();
  };

  if (!catalog || cart.items.length === 0) {
    return (
      <View className="w-full max-w-[560] flex-1 self-center bg-bistro-bg px-[18px]" style={{ paddingTop: insets.top + 12 }}>
        <LinearGradient colors={["#0a0c12", T.bg, "#12151f"]} style={StyleSheet.absoluteFill} />
        <Text className="text-bistro-muted">Nothing to pay.</Text>
      </View>
    );
  }

  return (
    <View className="w-full max-w-[560] flex-1 self-center bg-bistro-bg px-[18px]" style={{ paddingTop: insets.top + 8 }}>
      <LinearGradient colors={["#0a0c12", T.bg, "#12151f"]} style={StyleSheet.absoluteFill} />

      <View className="mb-2.5 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={12} className="py-1.5 pr-2">
          <Text className="text-[15px] font-extrabold text-bistro-gold-soft">← Back</Text>
        </Pressable>
        <Text className="text-lg font-black text-bistro-text">Demo payment</Text>
        <View style={{ width: 72 }} />
      </View>

      <Text className="mb-4 text-xs leading-[18px] text-bistro-muted">
        No real charge. Card details stay on this device and are never sent to the server.
      </Text>

      {step === "form" ? (
        <ScrollView
          style={scrollViewFill()}
          showsVerticalScrollIndicator
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="mb-5 rounded-bistro border border-bistro-line bg-bistro-glass p-4">
            <Text className="mb-1 text-xs text-bistro-muted">Amount due</Text>
            <Text className="text-[28px] font-black text-bistro-gold-soft">{formatCatalogMoney(catalog.currency, total)}</Text>
            <Text className="mt-1.5 text-xs text-white/40">{cart.items.length} line(s) in cart</Text>
          </View>

          <View className="mb-3.5">
            <Text className="mb-1.5 text-xs font-bold text-bistro-gold-dim">Card number</Text>
            <TextInput
              className={inputClass}
              value={formatCardDisplay(cardDigits)}
              onChangeText={onChangeCard}
              keyboardType="number-pad"
              placeholder="4242 4242 4242 4242"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoComplete="off"
              importantForAutofill="no"
            />
          </View>

          <View className="mb-3.5 flex-row items-start">
            <View className="mb-3.5 flex-1">
              <Text className="mb-1.5 text-xs font-bold text-bistro-gold-dim">Expiry</Text>
              <TextInput
                className={inputClass}
                value={expiry}
                onChangeText={onChangeExpiry}
                keyboardType="number-pad"
                placeholder="MM/YY"
                placeholderTextColor="rgba(255,255,255,0.3)"
                maxLength={5}
                autoComplete="off"
              />
            </View>
            <View className="w-3" />
            <View className="mb-3.5 max-w-[120] flex-1">
              <Text className="mb-1.5 text-xs font-bold text-bistro-gold-dim">CVV</Text>
              <TextInput
                className={inputClass}
                value={cvv}
                onChangeText={onChangeCvv}
                keyboardType="number-pad"
                placeholder="123"
                placeholderTextColor="rgba(255,255,255,0.3)"
                maxLength={4}
                secureTextEntry
                autoComplete="off"
              />
            </View>
          </View>

          <View className="mb-3.5">
            <Text className="mb-1.5 text-xs font-bold text-bistro-gold-dim">Name on card</Text>
            <TextInput
              className={inputClass}
              value={nameOnCard}
              onChangeText={(t) => {
                setNameOnCard(t);
                setError(null);
              }}
              placeholder="As printed on card"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="words"
              autoComplete="off"
            />
          </View>

          {error ? <Text className="mb-3 text-[13px] text-red-300">{error}</Text> : null}

          <Pressable onPress={onSubmit} disabled={submitting} className={submitting ? "opacity-60" : undefined}>
            <LinearGradient
              colors={[T.gold, T.goldSoft, T.gold]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ marginTop: 8, borderRadius: T.radii.md, paddingVertical: 16, alignItems: "center", justifyContent: "center" }}
            >
              {submitting ? <ActivityIndicator color="#1a1204" /> : <Text className="text-base font-black text-[#1a1204]">Pay (simulated)</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      ) : (
        <View className="flex-1 justify-center gap-3.5 py-6">
          <Text className="text-center text-[22px] font-black text-bistro-text">Payment simulated successfully</Text>
          <Text className="text-center text-sm leading-[22px] text-bistro-muted">Your cart will be cleared when you return. No money was charged.</Text>
          <Pressable
            onPress={onBackToCart}
            className="mt-2 self-center rounded-bistro border border-bistro-gold/45 bg-bistro-gold/15 px-7 py-3.5"
          >
            <Text className="text-[15px] font-extrabold text-bistro-gold-soft">Back to cart</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
