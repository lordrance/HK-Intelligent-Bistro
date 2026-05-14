import { z } from "zod";
import { CartSchema } from "./cart.js";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const AssistantIntentRequestSchema = z.object({
  userText: z.string().min(1),
  messages: z.array(ChatMessageSchema).max(24).default([]),
  cart: CartSchema,
  catalogVersion: z.string(),
});

export type AssistantIntentRequest = z.infer<typeof AssistantIntentRequestSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
