import { readFileSync } from "node:fs";
import path from "node:path";

import type { ChatMessage, PaletteEntry } from "@/lib/types";

const contentDirectory = path.join(process.cwd(), "content");

const systemRole = readFileSync(
  path.join(contentDirectory, "system-role.md"),
  "utf8",
).trim();

const p5Rules = readFileSync(path.join(contentDirectory, "p5-rules.md"), "utf8").trim();

const visualMetaphors = readFileSync(
  path.join(contentDirectory, "visual-metaphors.md"),
  "utf8",
).trim();

function formatTranscript(messages: ChatMessage[]): string {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");
}

function formatPaletteHints(palette: PaletteEntry[]): string {
  if (palette.length === 0) {
    return "- No direct keyword matches were found. Infer a gentle palette from the user description.";
  }

  return palette
    .map((entry) => `- ${entry.emotion}: ${entry.hex}`)
    .join("\n");
}

interface PromptInput {
  messages: ChatMessage[];
  currentSketchCode?: string;
  matchedEmotions: string[];
  matchedPalette: PaletteEntry[];
}

interface RepairPromptInput extends PromptInput {
  invalidResponse: string;
  validationErrors: string[];
}

export function getSystemInstruction(): string {
  return systemRole;
}

export function buildSketchPrompt(input: PromptInput): string {
  const currentSketchSection = input.currentSketchCode?.trim()
    ? `Current sketch code:\n\`\`\`js\n${input.currentSketchCode}\n\`\`\``
    : "Current sketch code:\n- No prior sketch exists yet.";

  const matchedEmotionSection =
    input.matchedEmotions.length > 0
      ? input.matchedEmotions.map((emotion) => `- ${emotion}`).join("\n")
      : "- No explicit emotion keywords matched.";

  return [
    "Help the user express their life experience as a complete p5.js sketch.",
    "Keep the explanation concise and beginner-friendly.",
    "Return JSON only that matches the provided response schema.",
    "Explanation must be 2 to 4 sentences.",
    "visualMetaphors must contain 2 to 4 short phrases.",
    "emotionTags must contain 1 to 6 lower-case emotion phrases.",
    "",
    "p5.js generation rules:",
    p5Rules,
    "",
    "Visual metaphor guide:",
    visualMetaphors,
    "",
    "Matched emotion hints:",
    matchedEmotionSection,
    "",
    "Deterministic emotion color hints:",
    formatPaletteHints(input.matchedPalette),
    "",
    "Conversation transcript:",
    formatTranscript(input.messages),
    "",
    currentSketchSection,
    "",
    "Build one complete replacement sketch that preserves the user's intent and incorporates the most recent request.",
  ].join("\n");
}

export function buildRepairPrompt(input: RepairPromptInput): string {
  return [
    "The previous response did not produce a valid p5.js sketch.",
    "Return corrected JSON only that matches the provided response schema.",
    "Keep the original creative intent and stay beginner-friendly.",
    "",
    "Validation errors:",
    input.validationErrors.map((error) => `- ${error}`).join("\n"),
    "",
    "Original invalid response:",
    input.invalidResponse,
    "",
    buildSketchPrompt(input),
  ].join("\n");
}
