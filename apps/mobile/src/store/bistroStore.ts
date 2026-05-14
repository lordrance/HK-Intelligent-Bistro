import { create } from "zustand";
import {
  applyCartActions,
  AssistantIntentResponseSchema,
  CatalogSchema,
  type AssistantIntentResponse,
  type Cart,
  type CartAction,
  type Catalog,
} from "@hk/shared";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Pending = {
  actions: CartAction[];
  assistant_message: string;
  confidence: number;
};

const emptyCart = (): Cart => ({ items: [], currency: "HKD" });

function isAutoApply(resp: AssistantIntentResponse): boolean {
  if (resp.needs_clarification) return false;
  if (resp.confidence < 0.9) return false;
  if (!resp.cart_actions.length) return false;
  return resp.cart_actions.every((a) => a.type === "ADD_LINE");
}

export const useBistroStore = create<{
  catalog: Catalog | null;
  catalogLoading: boolean;
  cart: Cart;
  messages: ChatMessage[];
  pending: Pending | null;
  undoStack: Cart[];
  assistantInFlight: boolean;

  loadCatalog: (baseUrl: string) => Promise<void>;
  addLineFromMenu: (params: { dishId: string; qty: number; selectedModifiers: Record<string, string> }) => void;
  setLineQty: (lineId: string, qty: number) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  sendUserMessage: (baseUrl: string, text: string) => Promise<void>;
  confirmPending: () => void;
  dismissPending: () => void;
  undo: () => void;
}>((set, get) => ({
  catalog: null,
  catalogLoading: true,
  cart: emptyCart(),
  messages: [],
  pending: null,
  undoStack: [],
  assistantInFlight: false,

  loadCatalog: async (baseUrl) => {
    set({ catalogLoading: true });
    try {
      const res = await fetch(`${baseUrl}/catalog`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: unknown = await res.json();
      const parsed = CatalogSchema.safeParse(raw);
      if (!parsed.success) throw new Error("invalid_catalog_shape");
      set({ catalog: parsed.data, catalogLoading: false });
    } catch {
      set({ catalog: null, catalogLoading: false });
    }
  },

  addLineFromMenu: ({ dishId, qty, selectedModifiers }) => {
    const result = applyCartActions(get().cart, [{ type: "ADD_LINE", dishId, qty, selectedModifiers }]);
    if (!result.ok) return;
    set((s) => ({ undoStack: [...s.undoStack, s.cart].slice(-12), cart: result.cart }));
  },

  setLineQty: (lineId, qty) => {
    const result = applyCartActions(get().cart, [{ type: "SET_QTY", lineId, qty }]);
    if (!result.ok) return;
    set((s) => ({ undoStack: [...s.undoStack, s.cart].slice(-12), cart: result.cart }));
  },

  removeLine: (lineId) => {
    const result = applyCartActions(get().cart, [{ type: "REMOVE_LINE", lineId }]);
    if (!result.ok) return;
    set((s) => ({ undoStack: [...s.undoStack, s.cart].slice(-12), cart: result.cart }));
  },

  clearCart: () => {
    set((s) => ({ undoStack: [...s.undoStack, s.cart].slice(-12), cart: emptyCart() }));
  },

  sendUserMessage: async (baseUrl, text) => {
    const cat = get().catalog;
    if (!cat) return;

    const userMsg: ChatMessage = { role: "user", content: text };

    if (get().assistantInFlight) {
      set((s) => ({
        messages: [
          ...s.messages,
          userMsg,
          {
            role: "assistant",
            content: "Please wait for the previous concierge reply to finish before sending another message.",
          },
        ],
      }));
      return;
    }

    set((s) => ({
      messages: [...s.messages, userMsg],
      assistantInFlight: true,
    }));

    let json: AssistantIntentResponse;
    try {
      try {
        const res = await fetch(`${baseUrl}/assistant/intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userText: text,
            messages: get().messages.map((m) => ({ role: m.role, content: m.content })),
            cart: get().cart,
            catalogVersion: cat.version,
          }),
        });

        let body: unknown;
        try {
          body = await res.json();
        } catch {
          body = null;
        }

        if (!res.ok) {
          const errMsg =
            body &&
            typeof body === "object" &&
            "error" in body &&
            typeof (body as { error: unknown }).error === "string"
              ? `Request failed (${res.status}): ${(body as { error: string }).error}`
              : `Request failed (${res.status}). Please try again.`;
          set((s) => ({
            messages: [...s.messages, { role: "assistant", content: errMsg }],
            pending: null,
          }));
          return;
        }

        const parsed = AssistantIntentResponseSchema.safeParse(body);
        if (!parsed.success) {
          set((s) => ({
            messages: [
              ...s.messages,
              {
                role: "assistant",
                content: "The server returned an unexpected response. Please try again.",
              },
            ],
            pending: null,
          }));
          return;
        }
        json = parsed.data;
      } catch {
        set((s) => ({
          messages: [
            ...s.messages,
            {
              role: "assistant",
              content:
                "Network error. Check your connection and that EXPO_PUBLIC_API_BASE_URL points to the running API.",
            },
          ],
          pending: null,
        }));
        return;
      }

      const clarify = json.needs_clarification;
      if (clarify) {
        const extra = clarify.options?.length
          ? "\n\n" + clarify.options.map((o) => `• ${o.label}`).join("\n")
          : "";
        set((s) => ({
          messages: [
            ...s.messages,
            {
              role: "assistant",
              content: `${json.assistant_message}\n\n${clarify.question}${extra}`,
            },
          ],
          pending: null,
        }));
        return;
      }

      if (!json.cart_actions.length) {
        set((s) => ({
          messages: [...s.messages, { role: "assistant", content: json.assistant_message }],
          pending: null,
        }));
        return;
      }

      if (isAutoApply(json)) {
        const r = applyCartActions(get().cart, json.cart_actions);
        if (r.ok) {
          set((s) => ({
            undoStack: [...s.undoStack, s.cart].slice(-12),
            cart: r.cart,
            messages: [...s.messages, { role: "assistant", content: json.assistant_message }],
            pending: null,
          }));
        } else {
          set((s) => ({
            messages: [
              ...s.messages,
              {
                role: "assistant",
                content: `${json.assistant_message}\n\n(Auto-apply failed: ${r.error})`,
              },
            ],
            pending: null,
          }));
        }
        return;
      }

      set((s) => ({
        messages: [...s.messages, { role: "assistant", content: json.assistant_message }],
        pending: {
          actions: json.cart_actions,
          assistant_message: json.assistant_message,
          confidence: json.confidence,
        },
      }));
    } finally {
      set({ assistantInFlight: false });
    }
  },

  confirmPending: () => {
    const p = get().pending;
    if (!p) return;
    const r = applyCartActions(get().cart, p.actions);
    if (!r.ok) {
      set((s) => ({
        messages: [
          ...s.messages,
          {
            role: "assistant",
            content: `Could not apply pending changes: ${r.error}. The pending panel was cleared.`,
          },
        ],
        pending: null,
      }));
      return;
    }
    set((s) => ({
      undoStack: [...s.undoStack, s.cart].slice(-12),
      cart: r.cart,
      pending: null,
    }));
  },

  dismissPending: () => set({ pending: null }),

  undo: () => {
    const stack = get().undoStack;
    if (!stack.length) return;
    const prev = stack[stack.length - 1];
    set({ cart: prev, undoStack: stack.slice(0, -1), pending: null });
  },
}));
