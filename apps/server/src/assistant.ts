import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import {
  AssistantIntentRequestSchema,
  AssistantIntentResponseSchema,
  type AssistantIntentResponse,
  type Catalog,
  type Dish,
} from "@hk/shared";
import { loadCatalog } from "./catalog.js";
import { searchDishes } from "./search.js";
import { cartLineIdSet, validateCartActions } from "./validateActions.js";

function env(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v && fallback === undefined) throw new Error(`Missing env ${name}`);
  return v as string;
}

function buildSystemPrompt(catalog: Catalog, candidates: Dish[]) {
  const miniMenu = candidates.map((d) => {
    const mods = (d.modifierGroups ?? []).map((g) => ({
      groupId: g.id,
      label: g.label,
      required: g.required,
      options: g.options.map((o) => ({ id: o.id, label: o.label })),
    }));
    return {
      id: d.id,
      name: d.name,
      category: d.category,
      basePrice: d.basePrice,
      aliases: d.aliases ?? [],
      modifierGroups: mods,
    };
  });

  return [
    "You are the Intelligent Bistro ordering concierge. You must:",
    "1) Reply in natural, polite, concise English.",
    "2) Output STRICT JSON only (no markdown, no code fences) with this shape:",
    "{",
    '  "assistant_message": string,',
    '  "cart_actions": CartAction[],',
    '  "needs_clarification"?: { "question": string, "options"?: { "dishId": string, "label": string }[] } | null,',
    '  "confidence": number // 0..1',
    "}",
    "",
    "CartAction is a discriminated union; every action MUST include a `type` field:",
    '- ADD_LINE: { type:"ADD_LINE", dishId, qty, selectedModifiers: Record<string,string>, note?: string, reason?: string }',
    '- REMOVE_LINE: { type:"REMOVE_LINE", lineId, reason?: string }',
    '- SET_QTY: { type:"SET_QTY", lineId, qty, reason?: string }  // qty=0 removes the line',
    '- UPDATE_MODIFIERS: { type:"UPDATE_MODIFIERS", lineId, selectedModifiers: Record<string,string>, reason?: string }',
    '- CLEAR_CART: { type:"CLEAR_CART", reason?: string }',
    '- REPLACE_DISH: { type:"REPLACE_DISH", lineId, newDishId, selectedModifiers, qty?: number, reason?: string }',
    "",
    "Rules:",
    "- Only use dishId values from the candidate menu below. If unsure, set needs_clarification instead of guessing.",
    "- For any action that references lineId, you MUST copy lineId from the provided cart snapshot (never invent ids).",
    "- If a dish has required modifierGroups, ADD_LINE/REPLACE_DISH MUST include selectedModifiers mapping groupId -> optionId.",
    "- If the user wants an empty cart, use CLEAR_CART.",
    "- If the user is only chatting or asking for suggestions, cart_actions may be an empty array.",
    "",
    `catalogVersion=${catalog.version}. Candidate menu (topK; incomplete but you may ONLY order items listed here):`,
    JSON.stringify(miniMenu),
  ].join("\n");
}

function buildUserPayload(input: { userText: string; cartJson: string; history: { role: string; content: string }[] }) {
  return [
    "Current cart snapshot (JSON):",
    input.cartJson,
    "",
    "Latest user utterance:",
    input.userText,
    "",
    "Recent conversation (trimmed):",
    JSON.stringify(input.history.slice(-8)),
  ].join("\n");
}

export async function handleAssistantIntent(body: unknown): Promise<AssistantIntentResponse> {
  const traceId = randomUUID();
  const parsed = AssistantIntentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      assistant_message: "The request payload looks invalid. Please try again.",
      cart_actions: [],
      confidence: 0,
      trace_id: traceId,
    };
  }

  const input = parsed.data;
  const catalog = await loadCatalog();

  if (input.catalogVersion !== catalog.version) {
    return {
      assistant_message: "The menu has been updated. Please refresh the menu and try again.",
      cart_actions: [],
      confidence: 0,
      trace_id: traceId,
    };
  }

  const candidates = searchDishes(catalog, input.userText, 8);
  const client = new OpenAI({
    apiKey: env("DEEPSEEK_API_KEY"),
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  });

  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  const system = buildSystemPrompt(catalog, candidates);
  const user = buildUserPayload({
    userText: input.userText,
    cartJson: JSON.stringify(input.cart),
    history: input.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {
      assistant_message: "The model returned non-JSON output, so I blocked any cart changes. Please repeat your request.",
      cart_actions: [],
      confidence: 0,
      trace_id: traceId,
    };
  }

  const resp = AssistantIntentResponseSchema.safeParse(json);
  if (!resp.success) {
    console.warn("[assistant] zod_parse_failed", resp.error.flatten(), "raw_len=", raw.length);
    return {
      assistant_message:
        "I understood you, but the structured response failed validation. To avoid mistakes, I did not change the cart. Please be more specific (dish + quantity + options).",
      cart_actions: [],
      confidence: 0,
      trace_id: traceId,
    };
  }

  const base = { ...resp.data, trace_id: traceId };

  if (base.needs_clarification) {
    return { ...base, cart_actions: [] };
  }

  const lineIds = cartLineIdSet(input.cart);
  const v = validateCartActions(catalog, lineIds, base.cart_actions);
  if (!v.ok) {
    return {
      assistant_message: `${base.assistant_message}\n\n(Note: I cannot apply cart changes because validation failed: ${v.reason})`,
      cart_actions: [],
      confidence: Math.min(base.confidence, 0.35),
      trace_id: traceId,
    };
  }

  return { ...base, cart_actions: v.actions, trace_id: traceId };
}
