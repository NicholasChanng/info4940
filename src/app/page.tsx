"use client";

import { startTransition, useDeferredValue, useState } from "react";

import { ChatPanel } from "@/components/chat-panel";
import { CodePanel } from "@/components/code-panel";
import { SketchPreview } from "@/components/sketch-preview";
import type {
  ApiErrorResponse,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  UIChatMessage,
} from "@/lib/types";

const starterPrompts = [
  "I felt lonely in a crowded room at a party.",
  "I felt like an outsider starting at a new school.",
  "I finally felt on top of the world after finishing something hard.",
  "I felt calm watching rain after a stressful week.",
];

function buildAssistantTranscriptContent(response: ChatResponse): string {
  return [
    response.explanation,
    response.visualMetaphors.length > 0
      ? `Visual metaphors: ${response.visualMetaphors.join(", ")}`
      : "",
    response.emotionTags.length > 0
      ? `Emotions: ${response.emotionTags.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function HomePage() {
  const [messages, setMessages] = useState<UIChatMessage[]>([]);
  const [latestResponse, setLatestResponse] = useState<ChatResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const deferredResponse = useDeferredValue(latestResponse);

  async function handleSubmit(value: string): Promise<boolean> {
    const trimmedValue = value.trim();

    if (!trimmedValue || trimmedValue.length > 600 || isLoading) {
      return false;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedValue,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setIsLoading(true);
    setRequestError(null);

    try {
      const requestBody: ChatRequest = {
        messages: nextMessages.slice(-6).map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        })),
        currentSketchCode: latestResponse?.p5Code,
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseBody = (await response.json()) as
        | ChatResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in responseBody
            ? responseBody.error
            : "The sketch request failed. Please try again.",
        );
      }

      const chatResponse = responseBody as ChatResponse;

      const assistantMessage: UIChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: buildAssistantTranscriptContent(chatResponse),
        assistantPayload: chatResponse,
      };

      startTransition(() => {
        setMessages([...nextMessages, assistantMessage]);
        setLatestResponse(chatResponse);
        setRequestError(null);
      });

      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The sketch request failed. Please try again.";

      setRequestError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-5%] h-64 w-64 rounded-full bg-[#f8d582]/30 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-72 w-72 rounded-full bg-[#7bdff2]/25 blur-3xl" />
        <div className="absolute bottom-[-12%] left-[28%] h-80 w-80 rounded-full bg-[#90be6d]/18 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6">
        <header className="rounded-[32px] border border-white/55 bg-white/55 px-6 py-6 shadow-[0_18px_72px_rgba(18,34,41,0.09)] backdrop-blur">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--muted)]">
              Bare-bones MVP
            </p>
            <h1 className="text-4xl leading-tight sm:text-5xl">
              Turn a life experience into a living sketch.
            </h1>
            <p className="max-w-5xl text-sm leading-7 text-[color:var(--muted)] sm:text-base">
              Describe a personal moment, let Gemini translate it into visual
              metaphors, and watch the sketch update in a live sandbox. The code
              stays visible so a beginner can learn from every iteration.
            </p>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <ChatPanel
            messages={messages}
            loading={isLoading}
            error={requestError}
            starterPrompts={starterPrompts}
            onSubmit={handleSubmit}
          />
          <SketchPreview code={deferredResponse?.p5Code ?? null} />
        </section>

        <section>
          <CodePanel
            code={deferredResponse?.p5Code ?? null}
            palette={deferredResponse?.colorPalette ?? []}
            emotionTags={deferredResponse?.emotionTags ?? []}
          />
        </section>
      </div>
    </main>
  );
}
