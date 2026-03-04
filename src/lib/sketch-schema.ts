import { z } from "zod";

import type { ChatMessage, ModelSketchResponse } from "@/lib/types";

export const chatMessageSchema: z.ZodType<ChatMessage> = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20),
  currentSketchCode: z.string().max(40000).optional(),
});

export const modelSketchResponseSchema: z.ZodType<ModelSketchResponse> = z
  .object({
    explanation: z.string().min(1).max(2000),
    visualMetaphors: z.array(z.string().min(1).max(120)).min(2).max(4),
    emotionTags: z.array(z.string().min(1).max(40)).min(1).max(6),
    p5Code: z.string().min(1).max(20000),
  })
  .strict();

export const modelSketchResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["explanation", "visualMetaphors", "emotionTags", "p5Code"],
  properties: {
    explanation: {
      type: "string",
      description: "A short beginner-friendly explanation in 2 to 4 sentences.",
    },
    visualMetaphors: {
      type: "array",
      description: "2 to 4 short visual metaphor phrases.",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "string",
      },
    },
    emotionTags: {
      type: "array",
      description: "1 to 6 lower-case emotion labels tied to the experience.",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "string",
      },
    },
    p5Code: {
      type: "string",
      description: "A complete self-contained p5.js sketch in plain JavaScript.",
    },
  },
} as const;
