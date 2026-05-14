import { Tabs } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#05060a", "#0f1118", "#151826", "#0b0c12"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "rgba(12,14,22,0.94)",
            borderTopWidth: 1,
            borderTopColor: "rgba(201,162,77,0.28)",
            height: 64,
            paddingBottom: 10,
            paddingTop: 6,
          },
          tabBarActiveTintColor: "#f3e7c7",
          tabBarInactiveTintColor: "#6b7280",
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Menu", tabBarIcon: () => <Text style={styles.emoji}>🍽</Text> }} />
        <Tabs.Screen name="cart" options={{ title: "Cart", tabBarIcon: () => <Text style={styles.emoji}>🛒</Text> }} />
        <Tabs.Screen name="assistant" options={{ title: "Concierge", tabBarIcon: () => <Text style={styles.emoji}>✨</Text> }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  emoji: { fontSize: 20 },
});
