import { create } from "zustand";
import {
  applyCartActions,
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
  catalogLoading: false,
  cart: emptyCart(),
  messages: [],
  pending: null,
  undoStack: [],

  loadCatalog: async (baseUrl) => {
    set({ catalogLoading: true });
    try {
      const res = await fetch(`${baseUrl}/catalog`);
      const data = (await res.json()) as Catalog;
      set({ catalog: data, catalogLoading: false });
    } catch {
      set({ catalogLoading: false });
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
    set((s) => ({ messages: [...s.messages, userMsg] }));

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

    const json = (await res.json()) as AssistantIntentResponse;

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
  },

  confirmPending: () => {
    const p = get().pending;
    if (!p) return;
    const r = applyCartActions(get().cart, p.actions);
    if (!r.ok) return;
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
