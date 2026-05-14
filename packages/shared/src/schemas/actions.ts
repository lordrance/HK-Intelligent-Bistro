import { z } from "zod";

export const CartActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ADD_LINE"),
    dishId: z.string(),
    qty: z.number().int().positive(),
    selectedModifiers: z.record(z.string()).default({}),
    note: z.string().optional(),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal("REMOVE_LINE"),
    lineId: z.string(),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal("SET_QTY"),
    lineId: z.string(),
    qty: z.number().int().nonnegative(),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal("UPDATE_MODIFIERS"),
    lineId: z.string(),
    selectedModifiers: z.record(z.string()),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal("CLEAR_CART"),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal("REPLACE_DISH"),
    lineId: z.string(),
    newDishId: z.string(),
    selectedModifiers: z.record(z.string()).default({}),
    qty: z.number().int().positive().optional(),
    reason: z.string().optional(),
  }),
]);

export const ClarificationSchema = z.object({
  question: z.string(),
  options: z
    .array(
      z.object({
        dishId: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
});

export const AssistantIntentResponseSchema = z.object({
  assistant_message: z.string(),
  cart_actions: z.array(CartActionSchema).default([]),
  /** 模型有时会输出 null；与 undefined 同等视为「无需澄清」 */
  needs_clarification: ClarificationSchema.optional().nullable(),
  confidence: z.number().min(0).max(1).default(0.5),
  trace_id: z.string().optional(),
});

export type CartAction = z.infer<typeof CartActionSchema>;
export type AssistantIntentResponse = z.infer<typeof AssistantIntentResponseSchema>;
export type Clarification = z.infer<typeof ClarificationSchema>;
