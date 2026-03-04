import { ApiError, GoogleGenAI } from "@google/genai";

import { buildRepairPrompt, buildSketchPrompt, getSystemInstruction } from "@/lib/prompt-builder";
import {
  modelSketchResponseJsonSchema,
  modelSketchResponseSchema,
} from "@/lib/sketch-schema";
import type { ChatMessage, ModelSketchResponse, PaletteEntry } from "@/lib/types";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

interface BaseGeminiInput {
  messages: ChatMessage[];
  currentSketchCode?: string;
  matchedEmotions: string[];
  matchedPalette: PaletteEntry[];
}

interface RepairGeminiInput extends BaseGeminiInput {
  invalidResponse: string;
  validationErrors: string[];
}

interface GeminiRequestErrorOptions {
  message: string;
  status: number;
  model: string;
}

export class GeminiRequestError extends Error {
  status: number;
  model: string;

  constructor(options: GeminiRequestErrorOptions) {
    super(options.message);
    this.name = "GeminiRequestError";
    this.status = options.status;
    this.model = options.model;
  }
}

function normalizeEnvValue(value: string | undefined): string | null {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function getPrimaryModel(): string {
  return normalizeEnvValue(process.env.GEMINI_MODEL) ?? DEFAULT_GEMINI_MODEL;
}

function getFallbackModel(primaryModel: string): string | null {
  const configuredFallback =
    normalizeEnvValue(process.env.GEMINI_FALLBACK_MODEL) ??
    (primaryModel === DEFAULT_GEMINI_FALLBACK_MODEL
      ? null
      : DEFAULT_GEMINI_FALLBACK_MODEL);

  return configuredFallback && configuredFallback !== primaryModel
    ? configuredFallback
    : null;
}

function isRateLimitError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 429;
}

function buildQuotaErrorMessage(model: string): string {
  if (model === "gemini-2.5-pro") {
    return 'Gemini quota is unavailable for "gemini-2.5-pro". Set `GEMINI_MODEL=gemini-2.5-flash` in `.env.local`, or enable Gemini billing, then try again.';
  }

  return `Gemini quota is currently exhausted for "${model}". Wait for quota to reset, or check your Gemini billing and usage limits, then try again.`;
}

function normalizeGeminiError(error: unknown, model: string): GeminiRequestError {
  if (error instanceof GeminiRequestError) {
    return error;
  }

  if (isRateLimitError(error)) {
    return new GeminiRequestError({
      status: 429,
      model,
      message: buildQuotaErrorMessage(model),
    });
  }

  if (error instanceof ApiError) {
    return new GeminiRequestError({
      status: error.status,
      model,
      message: `Gemini request failed for "${model}" with status ${error.status}.`,
    });
  }

  if (error instanceof Error) {
    return new GeminiRequestError({
      status: 500,
      model,
      message: error.message,
    });
  }

  return new GeminiRequestError({
    status: 500,
    model,
    message: "Gemini request failed unexpectedly.",
  });
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }

  return client;
}

function extractResponseText(response: { text?: unknown }): string {
  if (typeof response.text === "string") {
    return response.text;
  }

  if (typeof response.text === "function") {
    return String(response.text());
  }

  return "";
}

function parseJsonResponse(text: string): unknown {
  const normalizedText = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  return JSON.parse(normalizedText);
}

async function requestWithModel(
  model: string,
  prompt: string,
  temperature: number,
): Promise<ModelSketchResponse> {
  const response = await getClient().models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: getSystemInstruction(),
      candidateCount: 1,
      temperature,
      responseMimeType: "application/json",
      responseJsonSchema: modelSketchResponseJsonSchema,
    },
  });

  const responseText = extractResponseText(response);

  if (!responseText.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return modelSketchResponseSchema.parse(parseJsonResponse(responseText));
}

async function requestModelOutput(prompt: string, temperature: number): Promise<ModelSketchResponse> {
  const primaryModel = getPrimaryModel();
  const fallbackModel = getFallbackModel(primaryModel);

  try {
    return await requestWithModel(primaryModel, prompt, temperature);
  } catch (error) {
    const normalizedError = normalizeGeminiError(error, primaryModel);

    if (normalizedError.status === 429 && fallbackModel) {
      return requestWithModel(fallbackModel, prompt, temperature).catch(
        (fallbackError) => {
          throw normalizeGeminiError(fallbackError, fallbackModel);
        },
      );
    }

    throw normalizedError;
  }
}

export async function generateSketchDraft(input: BaseGeminiInput): Promise<ModelSketchResponse> {
  return requestModelOutput(buildSketchPrompt(input), 0.8);
}

export async function repairSketchDraft(input: RepairGeminiInput): Promise<ModelSketchResponse> {
  return requestModelOutput(buildRepairPrompt(input), 0.2);
}
