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
    "你是「Intelligent Bistro」的智能点餐助手。你要同时：",
    "1) 用自然、礼貌、简洁的中文回复用户；",
    "2) 输出严格 JSON（不要 markdown，不要代码块），字段如下：",
    "{",
    '  "assistant_message": string,',
    '  "cart_actions": CartAction[],',
    '  "needs_clarification"?: { "question": string, "options"?: { "dishId": string, "label": string }[] },',
    '  "confidence": number // 0~1',
    "}",
    "",
    "CartAction 只能是以下 discriminated union（必须包含 type 字段）：",
    '- ADD_LINE: { type:\"ADD_LINE\", dishId, qty, selectedModifiers: Record<string,string>, note?: string, reason?: string }',
    '- REMOVE_LINE: { type:\"REMOVE_LINE\", lineId, reason?: string }',
    '- SET_QTY: { type:\"SET_QTY\", lineId, qty, reason?: string }  // qty=0 表示删除该行',
    '- UPDATE_MODIFIERS: { type:\"UPDATE_MODIFIERS\", lineId, selectedModifiers: Record<string,string>, reason?: string }',
    '- CLEAR_CART: { type:\"CLEAR_CART\", reason?: string }',
    '- REPLACE_DISH: { type:\"REPLACE_DISH\", lineId, newDishId, selectedModifiers, qty?: number, reason?: string }',
    "",
    "规则：",
    "- 只能从候选菜单里选择 dishId；不确定就不要乱猜，输出 needs_clarification。",
    "- 任何涉及 lineId 的动作，必须使用我提供的购物车快照里的 lineId（不要编造）。",
    "- 若菜品有 required 的 modifierGroups，你必须在 ADD_LINE/REPLACE_DISH 的 selectedModifiers 填入选中的 option id（按 groupId -> optionId）。",
    "- 如果用户要清空购物车，用 CLEAR_CART。",
    "- 如果用户只是闲聊/问建议，cart_actions 可为空数组。",
    "",
    `catalogVersion=${catalog.version}。候选菜单（topK，可能不全，但只能点这里出现的菜）：`,
    JSON.stringify(miniMenu),
  ].join("\n");
}

function buildUserPayload(input: { userText: string; cartJson: string; history: { role: string; content: string }[] }) {
  return [
    "当前购物车快照（JSON）：",
    input.cartJson,
    "",
    "用户最新一句话：",
    input.userText,
    "",
    "近期对话（裁剪）：",
    JSON.stringify(input.history.slice(-8)),
  ].join("\n");
}

export async function handleAssistantIntent(body: unknown): Promise<AssistantIntentResponse> {
  const traceId = randomUUID();
  const parsed = AssistantIntentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      assistant_message: "请求格式不太对，我无法处理。请重试。",
      cart_actions: [],
      confidence: 0,
      trace_id: traceId,
    };
  }

  const input = parsed.data;
  const catalog = await loadCatalog();

  if (input.catalogVersion !== catalog.version) {
    return {
      assistant_message: "菜单版本已更新，请刷新菜单后再试。",
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
      assistant_message: "模型返回了非 JSON 内容，我已阻止修改购物车。请再说一次。",
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
        "我理解你的意思了，但结构化结果校验失败；为避免加错，我没有改动购物车。请更具体一点（菜名+数量+规格）。",
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
      assistant_message: `${base.assistant_message}\n\n（说明：为避免错误，我暂时不能执行购物车变更：${v.reason}）`,
      cart_actions: [],
      confidence: Math.min(base.confidence, 0.35),
      trace_id: traceId,
    };
  }

  return { ...base, cart_actions: v.actions, trace_id: traceId };
}
