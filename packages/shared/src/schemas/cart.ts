import { z } from "zod";

/** One cart line; lineId is stable for REMOVE / SET_QTY from the assistant. */
export const CartLineSchema = z.object({
  lineId: z.string(),
  dishId: z.string(),
  qty: z.number().int().positive(),
  /** modifierGroupId -> selected option id */
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
