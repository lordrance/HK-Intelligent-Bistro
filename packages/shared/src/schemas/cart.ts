import { z } from "zod";

/** 每行购物车：lineId 用于稳定定位（AI REMOVE/SET_QTY 等） */
export const CartLineSchema = z.object({
  lineId: z.string(),
  dishId: z.string(),
  qty: z.number().int().positive(),
  /** modifierOptionId -> 选中的 option id（单选组一个 key） */
  selectedModifiers: z.record(z.string()).default({}),
  note: z.string().optional(),
});

export const CartSchema = z.object({
  items: z.array(CartLineSchema),
  currency: z.string().default("HKD"),
  updatedAt: z.string().optional(),
});

export type CartLine = z.infer<typeof CartLineSchema>;
export type Cart = z.infer<typeof CartSchema>;
