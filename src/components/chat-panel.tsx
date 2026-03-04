"use client";

import { useState } from "react";

import { PromptChips } from "@/components/prompt-chips";
import type { UIChatMessage } from "@/lib/types";

interface ChatPanelProps {
  messages: UIChatMessage[];
  loading: boolean;
  error: string | null;
  starterPrompts: string[];
  onSubmit: (value: string) => Promise<boolean>;
}

const MAX_PROMPT_LENGTH = 600;

export function ChatPanel({
  messages,
  loading,
  error,
  starterPrompts,
  onSubmit,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const trimmedDraft = draft.trim();
  const characterCount = draft.length;
  const isOverLimit = characterCount > MAX_PROMPT_LENGTH;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedDraft) {
      setLocalError("Describe the experience you want the sketch to communicate.");
      return;
    }

    if (isOverLimit) {
      setLocalError("Keep the prompt under 600 characters for this MVP.");
      return;
    }

    setLocalError(null);
    const submittedDraft = trimmedDraft;
    const succeeded = await onSubmit(submittedDraft);

    if (succeeded) {
      setDraft("");
    }
  }

  const visibleError = localError ?? error;

  return (
    <section className="relative isolate flex min-h-[680px] flex-col rounded-[28px] border border-white/55 bg-[color:var(--card)] p-5 shadow-[0_24px_80px_rgba(18,34,41,0.12)] backdrop-blur lg:h-[820px] lg:min-h-0">
      <div className="relative z-10 space-y-4 border-b border-[color:var(--line)] pb-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--muted)]">
            Chat Coach
          </p>
          <h2 className="text-3xl leading-tight">Describe the feeling first.</h2>
          <p className="text-sm leading-6 text-[color:var(--muted)]">
            The assistant will translate your life experience into visual metaphors,
            explain the sketch simply, and generate a full p5.js sketch.
          </p>
        </div>
        <PromptChips prompts={starterPrompts} onSelect={setDraft} />
      </div>

      <div className="relative z-0 mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[color:var(--line)] bg-white/55 p-5 text-sm leading-6 text-[color:var(--muted)]">
            Start with a personal moment, like feeling lonely in a crowd or finally
            feeling at peace. Follow-up prompts can refine the current sketch.
          </div>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={`rounded-[24px] border px-4 py-4 ${
                message.role === "user"
                  ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
                  : "border-[color:var(--line)] bg-white/85"
              }`}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                {message.role === "user" ? "You" : "AI Coach"}
              </p>
              <p className="text-sm leading-6 text-[color:var(--ink)]">{message.content}</p>
              {message.assistantPayload ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                      Visual Metaphors
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {message.assistantPayload.visualMetaphors.map((metaphor) => (
                        <span
                          key={metaphor}
                          className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-medium text-[color:var(--ink)]"
                        >
                          {metaphor}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                      Detected Emotions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {message.assistantPayload.emotionTags.map((emotion) => (
                        <span
                          key={emotion}
                          className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs font-medium text-[color:var(--ink)]"
                        >
                          {emotion}
                        </span>
                      ))}
                    </div>
                  </div>
                  {message.assistantPayload.repairApplied ? (
                    <p className="text-xs font-medium text-[color:var(--warning)]">
                      The sketch needed one automatic repair pass before rendering.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 mt-4 space-y-3 border-t border-[color:var(--line)] pt-4">
        <label htmlFor="experience-input" className="text-sm font-semibold text-[color:var(--ink)]">
          Describe your experience
        </label>
        <textarea
          id="experience-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAX_PROMPT_LENGTH}
          rows={5}
          placeholder="Example: I felt like everyone else knew how to belong, and I was moving half a beat behind them."
          className="w-full rounded-[24px] border border-[color:var(--line)] bg-white/85 px-4 py-3 text-sm leading-6 text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]"
        />
        <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
          <span>{characterCount}/600</span>
          {visibleError ? (
            <span className="font-medium text-[color:var(--warning)]">{visibleError}</span>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={loading || !trimmedDraft || isOverLimit}
          className="w-full rounded-full bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? "Generating..." : "Generate sketch"}
        </button>
      </form>
    </section>
  );
}
