import { z } from "zod";

export const ModifierOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  priceDelta: z.number().default(0),
});

export const ModifierGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  required: z.boolean(),
  maxSelect: z.number().min(1).default(1),
  options: z.array(ModifierOptionSchema),
});

export const DishSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  basePrice: z.number(),
  imageUrl: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  modifierGroups: z.array(ModifierGroupSchema).default([]),
});

export const CatalogSchema = z.object({
  version: z.string(),
  currency: z.string().default("HKD"),
  dishes: z.array(DishSchema),
});

export type Catalog = z.infer<typeof CatalogSchema>;
export type Dish = z.infer<typeof DishSchema>;
export type ModifierGroup = z.infer<typeof ModifierGroupSchema>;
export type ModifierOption = z.infer<typeof ModifierOptionSchema>;
