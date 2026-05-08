import { readFileSync } from "node:fs";
import path from "node:path";

import type { ChatMessage, PaletteEntry } from "@/lib/types";

const contentDirectory = path.join(process.cwd(), "content");

const systemRole = readFileSync(
  path.join(contentDirectory, "system-role.md"),
  "utf8",
).trim();

const p5Rules = readFileSync(
  path.join(contentDirectory, "p5-rules.md"),
  "utf8",
).trim();

const visualMetaphors = readFileSync(
  path.join(contentDirectory, "visual-metaphors.md"),
  "utf8",
).trim();

function formatTranscript(messages: ChatMessage[]): string {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");
}

const DISABILITY_CONTEXT_KEYWORDS = [
  "disability", "disabled", "wheelchair", "prosthetic", "prosthesis",
  "chronic illness", "chronic pain", "chronic fatigue",
  "deaf", "blind", "visually impaired", "hearing impaired", "hard of hearing",
  "autism", "autistic", "neurodivergent", "neurodivergence", "adhd",
  "cerebral palsy", "multiple sclerosis", "parkinson",
  "epilepsy", "seizure", "amputee", "amputation",
  "diagnosis", "diagnosed", "accessible", "accessibility",
  "chronic", "condition", "impairment",
];

function detectsDisabilityContext(messages: ChatMessage[]): boolean {
  const latestUserMessage =
    messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const text = latestUserMessage.toLowerCase();
  return DISABILITY_CONTEXT_KEYWORDS.some((keyword) => text.includes(keyword));
}

const CULTURAL_CONTEXT_KEYWORDS = [
  "indigenous", "native american", "first nations", "aboriginal",
  "mexican", "latino", "latina", "latinx", "hispanic",
  "chinese", "japanese", "korean", "vietnamese", "thai", "indian",
  "african", "caribbean",
  "arabic", "middle eastern", "muslim", "jewish", "sikh",
  "ceremony", "ritual", "tradition", "heritage", "cultural", "ancestral",
  "tribe", "tribal", "ethnic", "diaspora",
];

function detectsCulturalContext(messages: ChatMessage[]): boolean {
  const latestUserMessage =
    messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const text = latestUserMessage.toLowerCase();
  return CULTURAL_CONTEXT_KEYWORDS.some((keyword) => text.includes(keyword));
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
  userCorrectedEmotionTags?: string[];
  userCorrectedVisualMetaphors?: string[];
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

  const userCorrectedTagsSection =
    input.userCorrectedEmotionTags && input.userCorrectedEmotionTags.length > 0
      ? [
          "User-corrected emotion tags (prefer these over the matched hints above):",
          input.userCorrectedEmotionTags.map((tag) => `- ${tag}`).join("\n"),
          "",
        ].join("\n")
      : "";

  const userCorrectedMetaphorsSection =
    input.userCorrectedVisualMetaphors && input.userCorrectedVisualMetaphors.length > 0
      ? [
          "User-corrected visual metaphors (incorporate these directly in the sketch; these take priority over the emotion color hints above. If a metaphor specifies a background quality such as 'bright background' or 'dark background', follow that metaphor even if it conflicts with the suggested palette):",
          input.userCorrectedVisualMetaphors.map((metaphor) => `- ${metaphor}`).join("\n"),
          "",
        ].join("\n")
      : "";

  const culturalContextNote = detectsCulturalContext(input.messages)
    ? "Cultural sensitivity: The user's prompt references a cultural context. Represent this through abstract emotional visuals — rhythm, warmth, motion, spatial relationships, color weight — NOT through literal cultural objects, clothing, or stereotypic symbols. The sketch must feel emotionally resonant without relying on reductive cultural markers."
    : "";

  const disabilityContextNote = detectsDisabilityContext(input.messages)
    ? "Disability sensitivity: The user's prompt references disability, chronic illness, neurodivergence, or accessibility. Do NOT default to dark colors, shattered shapes, or tragedy-coded imagery. The emotional tone must be driven by what the user explicitly expresses — which may be resilience, frustration, joy, pride, or complexity. Only use somber or heavy visuals if the user's own words describe grief or exhaustion."
    : "";

  return [
    "Help the user express their life experience as a complete p5.js sketch.",
    "Keep the explanation concise and beginner-friendly.",
    "Return JSON only that matches the provided response schema.",
    ...(culturalContextNote ? [culturalContextNote] : []),
    ...(disabilityContextNote ? [disabilityContextNote] : []),
    "Explanation must be 2 to 4 sentences.",
    "visualMetaphors must contain 2 to 4 short phrases.",
    "emotionTags must contain 1 to 6 lower-case emotion phrases.",
    "followUpQuestion must be a single sentence asking the user something only they can answer — a sensory detail, emotional nuance, or preference that will shape the next sketch.",
    "interpretationNote must be one sentence naming the single most consequential interpretive choice you made: which emotion or quality you prioritized and why, and what the user could say to shift it. Write it in plain language, not code. Example: 'I read this as quiet loneliness rather than anger because you mentioned stillness — tell me if you meant something sharper.'",
    "If the user expresses multiple emotions, do not collapse them into a single feeling.",
    "Represent mixed emotions explicitly in emotionTags, explanation, and visualMetaphors.",
    "If the emotions create ambiguity, conflict, or tension, acknowledge that tension instead of forcing a simplified interpretation.",
    "Use the followUpQuestion to clarify uncertainty only when the emotional balance, sensory detail, or visual priority is still unclear.",
    "Do not misread relational emotions. For example, being proud of a friend is different from feeling proud of yourself.",
    "Preserve the user's intended social context, target, and perspective when interpreting emotions.",
    "Make all important visual elements clearly distinguishable from the background using contrast in color, brightness, scale, motion, spacing, layering, or outline.",
    "If you describe visible effects such as rain, trails, glow, vibration, shadows, or pulses, the sketch must render them in a clearly perceptible way.",
    "Avoid using background and foreground colors that are too similar when the user expects an element to stand out.",
    "Prefer simple, stable, high-clarity visuals over fragile or barely visible effects.",
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
    "Suggested emotion color hints (use these as defaults; user-corrected visual metaphors take priority when they conflict):",
    formatPaletteHints(input.matchedPalette),
    "",
    userCorrectedTagsSection,
    userCorrectedMetaphorsSection,
    "Conversation transcript:",
    formatTranscript(input.messages),
    "",
    currentSketchSection,
    "",
    "Build one complete replacement sketch that preserves the user's intent and incorporates the most recent request.",
    "The sketch should feel coherent, emotionally faithful, and visually legible at a glance.",
  ]
    .filter((line) => line !== undefined && line !== "")
    .join("\n");
}

export function buildRepairPrompt(input: RepairPromptInput): string {
  return [
    "The previous response did not produce a valid p5.js sketch.",
    "Return corrected JSON only that matches the provided response schema.",
    "Keep the original creative intent and stay beginner-friendly.",
    "Preserve all clearly stated user emotions, corrections, and preferences.",
    "If the earlier attempt failed because the description was too abstract, conflicting, or visually unclear, simplify the composition while preserving the intended emotional meaning.",
    "Make visually important elements more legible and distinct if visibility may have contributed to the failure.",
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