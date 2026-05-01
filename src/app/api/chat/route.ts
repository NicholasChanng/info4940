import { NextResponse } from "next/server";

import { MAX_PROMPT_LENGTH } from "@/lib/constants";
import { logHarms } from "@/lib/harm-logging";
import {
  deriveEmotionContext,
  resolveEmotionTags,
  resolvePaletteForEmotionTags,
} from "@/lib/emotion-colors";
import {
  GeminiRequestError,
  generateSketchDraft,
  repairSketchDraft,
} from "@/lib/gemini";
import { chatRequestSchema } from "@/lib/sketch-schema";
import { validateSketchCode } from "@/lib/sketch-validation";
import type { ChatResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Please send a valid JSON chat payload." },
      { status: 400 },
    );
  }

  const parsedRequest = chatRequestSchema.safeParse(requestBody);

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Please send a valid chat payload." },
      { status: 400 },
    );
  }

  const recentMessages = parsedRequest.data.messages.slice(-6);
  const latestUserMessage = [...recentMessages]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMessage) {
    return NextResponse.json(
      { error: "A user message is required before generating a sketch." },
      { status: 400 },
    );
  }

  const trimmedPrompt = latestUserMessage.content.trim();

  if (!trimmedPrompt) {
    return NextResponse.json(
      { error: "Please describe the experience you want the sketch to express." },
      { status: 400 },
    );
  }

  if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: "Please keep the prompt under 600 characters." },
      { status: 400 },
    );
  }

  const emotionContext = deriveEmotionContext(recentMessages);
  const userContext = parsedRequest.data.userContext;

  try {
    let draft = await generateSketchDraft({
      messages: recentMessages,
      currentSketchCode: parsedRequest.data.currentSketchCode,
      matchedEmotions: emotionContext.matchedEmotions,
      matchedPalette: emotionContext.palette,
      userCorrectedEmotionTags: userContext?.emotionTags,
      userCorrectedVisualMetaphors: userContext?.visualMetaphors,
    });

    let validationResult = validateSketchCode(draft.p5Code);
    let repairApplied = false;

    // Harm 3: blocked sketches are never repaired or served
    if (validationResult.blocked) {
      return NextResponse.json(
        { error: "Visual output blocked: the generated code attempts to render a restricted symbol. Please describe a different experience." },
        { status: 422 },
      );
    }

    if (!validationResult.ok) {
      repairApplied = true;
      draft = await repairSketchDraft({
        messages: recentMessages,
        currentSketchCode: parsedRequest.data.currentSketchCode,
        matchedEmotions: emotionContext.matchedEmotions,
        matchedPalette: emotionContext.palette,
        userCorrectedEmotionTags: userContext?.emotionTags,
        userCorrectedVisualMetaphors: userContext?.visualMetaphors,
        invalidResponse: JSON.stringify(draft, null, 2),
        validationErrors: validationResult.errors,
      });

      validationResult = validateSketchCode(draft.p5Code);
      if (validationResult.blocked) {
        return NextResponse.json(
          { error: "Visual output blocked: the generated code attempts to render a restricted symbol. Please describe a different experience." },
          { status: 422 },
        );
      }
    }

    if (!validationResult.ok) {
      throw new Error(validationResult.errors.join("; "));
    }

    const emotionTags = resolveEmotionTags(
      draft.emotionTags,
      emotionContext.matchedEmotions,
    );

    // Harm 1 & 2: log cultural and disability signals for audit
    logHarms({
      prompt: trimmedPrompt,
      messageCount: recentMessages.length,
      palette: resolvePaletteForEmotionTags(emotionTags, emotionContext.palette),
      visualMetaphors: draft.visualMetaphors,
    });

    const responseBody: ChatResponse = {
      explanation: draft.explanation,
      visualMetaphors: draft.visualMetaphors,
      emotionTags,
      colorPalette: resolvePaletteForEmotionTags(emotionTags, emotionContext.palette),
      p5Code: draft.p5Code,
      repairApplied,
      followUpQuestion: draft.followUpQuestion,
      interpretationNote: draft.interpretationNote,
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Sketch generation failed:", error);

    if (error instanceof GeminiRequestError) {
      if (error.status === 429) {
        return NextResponse.json(
          {
            error: error.message,
          },
          { status: 429 },
        );
      }

      if (error.message === "Missing GEMINI_API_KEY.") {
        return NextResponse.json(
          {
            error: "Missing GEMINI_API_KEY in .env.local. Add it and restart the dev server.",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "I couldn't turn that description into a working sketch just now. Please try again.",
      },
      { status: 500 },
    );
  }
}
