import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

const TOKEN_KEY = "hk_bistro_access_token";

export type AuthUser = { id: string; email: string };

function readWebToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeWebToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

function removeWebToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (token: string, user: AuthUser) => Promise<void>;
  clearSession: () => Promise<void>;
  /** Load token from SecureStore and validate against GET /auth/me */
  restoreSession: (baseUrl: string) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrated: false,

  setSession: async (token, user) => {
    if (Platform.OS === "web") {
      writeWebToken(token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
    set({ token, user });
  },

  clearSession: async () => {
    if (Platform.OS === "web") {
      removeWebToken();
    } else {
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } catch {
        /* ignore */
      }
    }
    set({ token: null, user: null });
  },

  restoreSession: async (baseUrl) => {
    set({ hydrated: false });
    let token: string | null = null;
    try {
      if (Platform.OS === "web") {
        token = readWebToken();
      } else {
        token = await SecureStore.getItemAsync(TOKEN_KEY);
      }
    } catch {
      token = null;
    }
    if (!token) {
      set({ token: null, user: null, hydrated: true });
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        await get().clearSession();
        set({ hydrated: true });
        return;
      }
      const user = (await res.json()) as AuthUser;
      set({ token, user, hydrated: true });
    } catch {
      await get().clearSession();
      set({ hydrated: true });
    }
  },
}));
