import emotionColorData from "../../content/emotion-colors.json";

import type { ChatMessage, PaletteEntry } from "@/lib/types";

interface EmotionColorEntry extends PaletteEntry {}

const emotionColorEntries = emotionColorData as EmotionColorEntry[];

const emotionColorMap = new Map(
  emotionColorEntries.map((entry) => [entry.emotion, entry.hex]),
);

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeEmotion(value: string): string {
  return value.toLowerCase().replace(/[^a-z\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function lookupEmotionKey(value: string): string | null {
  const normalizedValue = normalizeEmotion(value);

  for (const entry of emotionColorEntries) {
    if (
      normalizedValue === entry.emotion ||
      normalizedValue.includes(entry.emotion) ||
      entry.emotion.includes(normalizedValue)
    ) {
      return entry.emotion;
    }
  }

  return null;
}

export function matchEmotionKeywords(
  latestUserMessage: string,
  transcript: string,
): string[] {
  const normalizedLatest = normalizeEmotion(latestUserMessage);
  const normalizedTranscript = normalizeEmotion(transcript);

  const latestMatches = emotionColorEntries
    .filter((entry) => normalizedLatest.includes(entry.emotion))
    .map((entry) => entry.emotion);

  const transcriptMatches = emotionColorEntries
    .filter((entry) => normalizedTranscript.includes(entry.emotion))
    .map((entry) => entry.emotion);

  return uniqueStrings([...latestMatches, ...transcriptMatches]);
}

export function getPaletteForEmotions(emotions: string[]): PaletteEntry[] {
  return uniqueStrings(
    emotions
      .map((emotion) => lookupEmotionKey(emotion))
      .filter((emotion): emotion is string => Boolean(emotion)),
  ).map((emotion) => ({
    emotion,
    hex: emotionColorMap.get(emotion) ?? "#5C6B73",
  }));
}

export function deriveEmotionContext(messages: ChatMessage[]): {
  matchedEmotions: string[];
  palette: PaletteEntry[];
} {
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const transcript = messages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  const matchedEmotions = matchEmotionKeywords(latestUserMessage, transcript);

  return {
    matchedEmotions,
    palette: getPaletteForEmotions(matchedEmotions),
  };
}

export function resolveEmotionTags(
  modelEmotionTags: string[],
  fallbackEmotionTags: string[],
): string[] {
  const normalizedModelTags = uniqueStrings(
    modelEmotionTags.map(normalizeEmotion).filter(Boolean),
  );

  return (normalizedModelTags.length > 0
    ? normalizedModelTags
    : fallbackEmotionTags
  ).slice(0, 6);
}

export function resolvePaletteForEmotionTags(
  emotionTags: string[],
  fallbackPalette: PaletteEntry[],
): PaletteEntry[] {
  const palette = getPaletteForEmotions(emotionTags);

  return palette.length > 0 ? palette : fallbackPalette;
}

export function getEmotionColorEntries(): EmotionColorEntry[] {
  return emotionColorEntries;
}
