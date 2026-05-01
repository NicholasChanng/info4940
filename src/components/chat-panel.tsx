"use client";

import { useEffect, useState } from "react";

import { detectInterventionTriggers, generateInterventionResponse, shouldIntervene } from "@/lib/communication-protocol/intervention-detector";
import type { InterventionResponse } from "@/lib/communication-protocol/types";
import { MAX_PROMPT_LENGTH } from "@/lib/constants";
import { getEmotionColorEntries } from "@/lib/emotion-colors";
import type { ApiErrorType, UIChatMessage, UserContext } from "@/lib/types";
import { detectVulnerability } from "@/lib/vulnerability-detector";
import type { VulnerabilitySignal } from "@/lib/vulnerability-detector";

const LOADING_STAGES = [
  "Reading your experience…",
  "Identifying the emotional core…",
  "Selecting visual metaphors…",
  "Writing sketch code…",
];

// Harm 4: visual style quick-picks for the assistive prompt panel
const STYLE_CHIPS = [
  { label: "still and slow", suffix: "with a still, slow quality" },
  { label: "fast and urgent", suffix: "with fast, urgent movement" },
  { label: "quiet and muted", suffix: "with quiet, muted colors" },
  { label: "vivid and bright", suffix: "with vivid, bright colors" },
  { label: "chaotic and scattered", suffix: "with a scattered, chaotic energy" },
  { label: "centered and calm", suffix: "with a centered, calm feeling" },
];

const EMOTION_CHIPS = getEmotionColorEntries().map((e) => e.emotion);

interface ChatPanelProps {
  messages: UIChatMessage[];
  loading: boolean;
  error: string | null;
  errorType?: ApiErrorType | null;
  runtimeError: string | null;
  editedContext: UserContext | null;
  onContextEdit: (update: UserContext) => void;
  onSubmit: (value: string) => Promise<boolean>;
  onReset: () => void;
}

function humanizeRuntimeError(message: string): { summary: string; tip: string } {
  if (message.includes("is not defined")) {
    const name = message.match(/(\w+) is not defined/)?.[1] ?? "Something";
    return {
      summary: `The sketch tried to use "${name}" but that variable or function doesn't exist in this context.`,
      tip: "Try describing the effect differently — the AI may have used a feature that p5.js doesn't support here.",
    };
  }
  if (message.includes("Cannot read propert") || message.includes("Cannot set propert") || message.includes("null")) {
    return {
      summary: "The sketch tried to access part of an object that didn't exist yet.",
      tip: "Send a follow-up to simplify the sketch, or ask for fewer simultaneous effects.",
    };
  }
  if (message.includes("is not a function")) {
    return {
      summary: "The sketch called something as a function that isn't one.",
      tip: "Try rephrasing your request — this usually means the generated code has a typo or unsupported feature.",
    };
  }
  return {
    summary: "The sketch ran into an unexpected error while rendering.",
    tip: 'Try sending a follow-up message like "simplify the sketch" to get a more stable version.',
  };
}

function EditableChipList({
  items,
  onRemove,
  onAdd,
  chipClassName,
  inputPlaceholder,
}: {
  items: string[];
  onRemove: (index: number) => void;
  onAdd: (value: string) => void;
  chipClassName: string;
  inputPlaceholder: string;
}) {
  const [adding, setAdding] = useState(false);
  const [inputValue, setInputValue] = useState("");

  function commit() {
    const trimmed = inputValue.trim();
    if (trimmed) onAdd(trimmed);
    setInputValue("");
    setAdding(false);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className={`inline-flex items-center gap-1 ${chipClassName}`}>
          {item}
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remove ${item}`}
            className="ml-0.5 rounded-full opacity-50 transition hover:opacity-100 focus:opacity-100"
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setAdding(false); setInputValue(""); }
          }}
          onBlur={commit}
          placeholder={inputPlaceholder}
          className="w-28 rounded-full border border-dashed border-[color:var(--accent)] bg-white px-3 py-1 text-xs text-[color:var(--ink)] outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-full border border-dashed border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--ink)] hover:text-[color:var(--ink)]"
        >
          + add
        </button>
      )}
    </div>
  );
}

function errorGuidance(errorType: ApiErrorType | null): { what: string; tip: string | null } {
  switch (errorType) {
    case "generation_failed":
      return {
        what: "The AI generated code that couldn't run — this wasn't your description.",
        tip: "Try again as-is. If it keeps failing, describe what the experience looks or feels like physically (movement, weight, texture, color) rather than naming the emotion.",
      };
    case "api_unavailable":
      return { what: "Gemini is temporarily unavailable.", tip: "Wait a moment and try again — nothing is wrong with your description." };
    case "rate_limited":
      return { what: "Gemini's quota is exhausted.", tip: "Wait for quota to reset, then try again." };
    case "blocked":
      return { what: "The visual output was blocked.", tip: "Try describing a different aspect of the experience." };
    case "missing_key":
      return { what: "API key is missing.", tip: null };
    default:
      return { what: "Something went wrong.", tip: "Try again." };
  }
}

export function ChatPanel({
  messages,
  loading,
  error,
  errorType = null,
  runtimeError,
  editedContext,
  onContextEdit,
  onSubmit,
  onReset,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [interventionResponse, setInterventionResponse] = useState<InterventionResponse | null>(null);
  const [vulnerabilitySignal, setVulnerabilitySignal] = useState<VulnerabilitySignal | null>(null);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      setLoadingStageIndex(0);
      return;
    }
    const id = setInterval(() => {
      setLoadingStageIndex((i) => {
        if (i >= LOADING_STAGES.length - 1) {
          clearInterval(id);
          return i;
        }
        return i + 1;
      });
    }, 2200);
    return () => clearInterval(id);
  }, [loading]);

  const trimmedDraft = draft.trim();
  const characterCount = draft.length;
  const isOverLimit = characterCount > MAX_PROMPT_LENGTH;
  const wordCount = trimmedDraft ? trimmedDraft.split(/\s+/).filter(Boolean).length : 0;
  // Harm 4: show assistive panel when user has typed something short
  const showPromptAssistant = trimmedDraft.length > 0 && wordCount < 8;

  let lastAssistantMessageId: string | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantMessageId = messages[i].id;
      break;
    }
  }

  async function submitSketch(value: string) {
    setVulnerabilitySignal(null);
    setLocalError(null);
    setInterventionResponse(null);
    const succeeded = await onSubmit(value);
    if (succeeded) setDraft("");
  }

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

    // Harm 5: vulnerability check — pause and show reframing card before generating
    if (!vulnerabilitySignal) {
      const signal = detectVulnerability(trimmedDraft);
      if (signal.level !== "none") {
        setVulnerabilitySignal(signal);
        return;
      }
    }

    // Communication intervention check
    const triggers = detectInterventionTriggers(trimmedDraft);
    if (shouldIntervene(triggers, trimmedDraft)) {
      setInterventionResponse(generateInterventionResponse(triggers[0], trimmedDraft));
      return;
    }

    await submitSketch(trimmedDraft);
  }



  return (
    <section className="relative isolate flex min-h-[816px] flex-col rounded-[28px] border border-white/55 bg-[color:var(--card)] p-5 shadow-[0_24px_80px_rgba(18,34,41,0.12)] backdrop-blur lg:h-[984px] lg:min-h-0">
      {messages.length > 0 && (
        <div className="relative z-10 flex justify-end border-b border-[color:var(--line)] pb-4">
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 rounded-full border border-[color:var(--line)] bg-white/60 px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] transition hover:bg-white hover:text-[color:var(--ink)]"
          >
            New sketch
          </button>
        </div>
      )}

      <div className="relative z-0 mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">

        {/* Harm 5: vulnerability reframing card */}
        {vulnerabilitySignal && vulnerabilitySignal.level !== "none" && (
          <div className={`rounded-[24px] border px-4 py-4 ${
            vulnerabilitySignal.level === "crisis"
              ? "border-rose-300 bg-rose-50"
              : "border-violet-200 bg-violet-50"
          }`}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              A note before we continue
            </p>
            <p className="text-sm leading-6 text-[color:var(--ink)]">
              What you shared sounds deeply personal. This tool is here to help you express it through art —
              it&apos;s not a therapist or a crisis line, and the sketch it creates won&apos;t be able to hold what you&apos;re carrying.
            </p>
            {vulnerabilitySignal.level === "crisis" && (
              <p className="mt-2 text-sm leading-6 text-rose-700">
                If you&apos;re in crisis or need to talk to someone, please reach out to the{" "}
                <a
                  href="https://988lifeline.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 font-medium"
                >
                  988 Suicide &amp; Crisis Lifeline
                </a>{" "}
                — call or text <strong>988</strong>, available 24/7.
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => submitSketch(trimmedDraft)}
                className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-black"
              >
                Continue to sketch
              </button>
              <button
                type="button"
                onClick={() => setVulnerabilitySignal(null)}
                className="rounded-full border border-[color:var(--line)] bg-white/60 px-4 py-2 text-xs font-semibold text-[color:var(--muted)] transition hover:bg-white"
              >
                Go back
              </button>
            </div>
          </div>
        )}

        {/* Communication intervention card */}
        {interventionResponse && (
          <div className="rounded-[24px] border border-[color:var(--accent)] bg-[color:var(--accent-soft)] px-4 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              AI Coach
            </p>
            <p className="text-sm leading-6 text-[color:var(--ink)]">{interventionResponse.message}</p>
            {interventionResponse.options && (
              <div className="mt-3 flex flex-wrap gap-2">
                {interventionResponse.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      const suffix = interventionResponse.optionSuffix
                        ? ` - ${interventionResponse.optionSuffix} ${option.toLowerCase()}`
                        : ` - ${option.toLowerCase()}`;
                      setDraft(trimmedDraft + suffix);
                      setInterventionResponse(null);
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs text-[color:var(--ink)] border border-[color:var(--line)] hover:bg-[color:var(--accent-soft)] transition"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.length === 0 ? null : (
          messages.map((message) => {
            const isLatestAssistant = message.id === lastAssistantMessageId;
            const payload = message.assistantPayload;

            const displayedTags = isLatestAssistant
              ? (editedContext?.emotionTags ?? payload?.emotionTags ?? [])
              : payload?.emotionTags ?? [];
            const displayedMetaphors = isLatestAssistant
              ? (editedContext?.visualMetaphors ?? payload?.visualMetaphors ?? [])
              : payload?.visualMetaphors ?? [];

            function handleTagRemove(index: number) {
              onContextEdit({
                emotionTags: displayedTags.filter((_, i) => i !== index),
                visualMetaphors: editedContext?.visualMetaphors ?? payload?.visualMetaphors ?? [],
              });
            }
            function handleTagAdd(value: string) {
              onContextEdit({
                emotionTags: [...displayedTags, value.toLowerCase()],
                visualMetaphors: editedContext?.visualMetaphors ?? payload?.visualMetaphors ?? [],
              });
            }
            function handleMetaphorRemove(index: number) {
              onContextEdit({
                emotionTags: editedContext?.emotionTags ?? payload?.emotionTags ?? [],
                visualMetaphors: displayedMetaphors.filter((_, i) => i !== index),
              });
            }
            function handleMetaphorAdd(value: string) {
              onContextEdit({
                emotionTags: editedContext?.emotionTags ?? payload?.emotionTags ?? [],
                visualMetaphors: [...displayedMetaphors, value],
              });
            }

            return (
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

                {payload ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                          Visual Metaphors
                        </p>
                        {isLatestAssistant && (
                          <span className="rounded-full bg-[color:var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--muted)]">
                            editable
                          </span>
                        )}
                      </div>
                      {isLatestAssistant ? (
                        <EditableChipList
                          items={displayedMetaphors}
                          onRemove={handleMetaphorRemove}
                          onAdd={handleMetaphorAdd}
                          chipClassName="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-medium text-[color:var(--ink)]"
                          inputPlaceholder="new metaphor"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {displayedMetaphors.map((metaphor) => (
                            <span key={metaphor} className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-medium text-[color:var(--ink)]">
                              {metaphor}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                          Detected Emotions
                        </p>
                        {isLatestAssistant && (
                          <span className="rounded-full bg-[color:var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--muted)]">
                            editable
                          </span>
                        )}
                      </div>
                      {isLatestAssistant ? (
                        <EditableChipList
                          items={displayedTags}
                          onRemove={handleTagRemove}
                          onAdd={handleTagAdd}
                          chipClassName="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs font-medium text-[color:var(--ink)]"
                          inputPlaceholder="new emotion"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {displayedTags.map((emotion) => (
                            <span key={emotion} className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs font-medium text-[color:var(--ink)]">
                              {emotion}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {isLatestAssistant && editedContext && (
                      <p className="text-xs font-medium text-[color:var(--accent)]">
                        Your corrections will shape the next sketch.
                      </p>
                    )}

                    {payload.interpretationNote && (
                      <div className="rounded-[16px] border border-[color:var(--line)] bg-white/60 px-4 py-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                          How I read this
                        </p>
                        <p className="text-sm leading-6 text-[color:var(--ink)]">{payload.interpretationNote}</p>
                      </div>
                    )}

                    {payload.followUpQuestion && (
                      <div className="rounded-[16px] border border-[color:var(--accent)] bg-[color:var(--accent-soft)] px-4 py-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                          Coach asks
                        </p>
                        <p className="text-sm leading-6 text-[color:var(--ink)]">{payload.followUpQuestion}</p>
                      </div>
                    )}

                    {payload.repairApplied ? (
                      <p className="text-xs font-medium text-[color:var(--warning)]">
                        The sketch needed one automatic repair pass before rendering.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })
        )}

        {loading && (
          <div className="rounded-[24px] border border-[color:var(--line)] bg-white/85 px-4 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              AI Coach
            </p>
            <div className="flex items-center gap-3">
              <svg className="h-4 w-4 shrink-0 animate-spin text-[color:var(--muted)]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-[color:var(--muted)]">{LOADING_STAGES[loadingStageIndex]}</p>
            </div>
          </div>
        )}

        {runtimeError && (() => {
          const { summary, tip } = humanizeRuntimeError(runtimeError);
          return (
            <div className="rounded-[24px] border border-orange-300 bg-orange-50 px-4 py-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
                Canvas error
              </p>
              <p className="text-sm leading-6 text-[color:var(--ink)]">{summary}</p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">{tip}</p>
            </div>
          );
        })()}
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

        {/* Harm 4: assistive prompt panel — appears when draft is short */}
        {showPromptAssistant && (
          <div className="rounded-[20px] border border-[color:var(--line)] bg-white/70 px-4 py-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Prompt assistant — tap to add detail
            </p>
            <div>
              <p className="mb-1.5 text-[11px] text-[color:var(--muted)]">Emotion</p>
              <div className="flex flex-wrap gap-1.5">
                {EMOTION_CHIPS.map((emotion) => (
                  <button
                    key={emotion}
                    type="button"
                    onClick={() => setDraft((d) => `${d.trimEnd()} — feeling ${emotion}`)}
                    className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs text-[color:var(--ink)] transition hover:bg-[color:var(--accent-soft)] hover:border-[color:var(--accent)]"
                  >
                    {emotion}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] text-[color:var(--muted)]">Visual quality</p>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_CHIPS.map(({ label, suffix }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setDraft((d) => `${d.trimEnd()}, ${suffix}`)}
                    className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs text-[color:var(--ink)] transition hover:bg-[color:var(--accent-soft)] hover:border-[color:var(--accent)]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
          <span>{characterCount}/{MAX_PROMPT_LENGTH}</span>
          {localError ? (
            <span className="font-medium text-[color:var(--warning)]">{localError}</span>
          ) : null}
        </div>

        {error && !localError ? (() => {
          const { what, tip } = errorGuidance(errorType);
          return (
            <div className="rounded-[16px] border border-orange-200 bg-orange-50 px-4 py-3 text-xs space-y-1">
              <p className="font-semibold text-orange-700">{what}</p>
              {tip && <p className="text-orange-600">{tip}</p>}
            </div>
          );
        })() : null}
        <button
          type="submit"
          disabled={loading || !trimmedDraft || isOverLimit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? LOADING_STAGES[loadingStageIndex] : "Generate sketch"}
        </button>
      </form>
    </section>
  );
}
