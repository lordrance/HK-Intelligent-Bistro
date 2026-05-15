import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useBistroStore } from "@/store/bistroStore";
import { Button, ButtonText } from "@/components/ui/button";

/** Compact header logout — same size on Menu, Cart, etc. */
export function LogOutButton() {
  const router = useRouter();
  const resetAfterLogout = useBistroStore((s) => s.resetAfterLogout);

  async function onLogout() {
    await useAuthStore.getState().clearSession();
    resetAfterLogout();
    router.replace("/login");
  }

  return (
    <Button variant="outline" size="sm" onPress={() => void onLogout()}>
      <ButtonText className="text-xs">Log out</ButtonText>
    </Button>
  );
}
