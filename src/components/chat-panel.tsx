"use client";

import { useEffect, useState } from "react";

const LOADING_STAGES = [
  "Reading your experience…",
  "Identifying the emotional core…",
  "Selecting visual metaphors…",
  "Writing sketch code…",
];

import { PromptChips } from "@/components/prompt-chips";
import { detectInterventionTriggers, generateInterventionResponse, shouldIntervene } from "@/lib/communication-protocol/intervention-detector";
import type { UIChatMessage, UserContext } from "@/lib/types";

interface ChatPanelProps {
  messages: UIChatMessage[];
  loading: boolean;
  error: string | null;
  runtimeError: string | null;
  starterPrompts: string[];
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

const MAX_PROMPT_LENGTH = 600;

// Inline chip list with add/remove editing
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
        <span
          key={`${item}-${i}`}
          className={`inline-flex items-center gap-1 ${chipClassName}`}
        >
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
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              setAdding(false);
              setInputValue("");
            }
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

export function ChatPanel({
  messages,
  loading,
  error,
  runtimeError,
  starterPrompts,
  editedContext,
  onContextEdit,
  onSubmit,
  onReset,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [interventionMessage, setInterventionMessage] = useState<string | null>(null);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      setLoadingStageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStageIndex((i) => Math.min(i + 1, LOADING_STAGES.length - 1));
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  const trimmedDraft = draft.trim();
  const characterCount = draft.length;
  const isOverLimit = characterCount > MAX_PROMPT_LENGTH;

  // Only the last assistant message is editable
  let lastAssistantMessageId: string | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantMessageId = messages[i].id;
      break;
    }
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

    // Check for communication issues before submitting
    const triggers = detectInterventionTriggers(trimmedDraft);
    if (shouldIntervene(triggers, trimmedDraft)) {
      const intervention = generateInterventionResponse(triggers[0], trimmedDraft);
      setInterventionMessage(intervention.message);
      return;
    }

    setLocalError(null);
    setInterventionMessage(null);
    const submittedDraft = trimmedDraft;
    const succeeded = await onSubmit(submittedDraft);

    if (succeeded) {
      setDraft("");
    }
  }

  const visibleError = localError ?? error ?? interventionMessage;

  return (
    <section className="relative isolate flex min-h-[816px] flex-col rounded-[28px] border border-white/55 bg-[color:var(--card)] p-5 shadow-[0_24px_80px_rgba(18,34,41,0.12)] backdrop-blur lg:h-[984px] lg:min-h-0">
      <div className="relative z-10 space-y-4 border-b border-[color:var(--line)] pb-4">
        <div className="flex items-start justify-between gap-3">
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
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="shrink-0 rounded-full border border-[color:var(--line)] bg-white/60 px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] transition hover:bg-white hover:text-[color:var(--ink)]"
            >
              New sketch
            </button>
          )}
        </div>
        <PromptChips prompts={starterPrompts} onSelect={setDraft} />
      </div>

      <div className="relative z-0 mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {/* Intervention message display */}
        {interventionMessage && (
          <div className="rounded-[24px] border border-[color:var(--accent)] bg-[color:var(--accent-soft)] px-4 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              AI Coach
            </p>
            <p className="text-sm leading-6 text-[color:var(--ink)]">{interventionMessage}</p>
            <p className="mt-2 text-xs text-[color:var(--muted)]">
              What do you mean by that? Please be more specific and concrete.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {interventionMessage.includes("heavier") && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(trimmedDraft + " - I meant slower movement and pacing");
                      setInterventionMessage(null);
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs text-[color:var(--ink)] border border-[color:var(--line)] hover:bg-[color:var(--accent-soft)] transition"
                  >
                    Slower movement and pacing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(trimmedDraft + " - I meant darker colors and tones");
                      setInterventionMessage(null);
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs text-[color:var(--ink)] border border-[color:var(--line)] hover:bg-[color:var(--accent-soft)] transition"
                  >
                    Darker colors and tones
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(trimmedDraft + " - I meant denser visual elements");
                      setInterventionMessage(null);
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs text-[color:var(--ink)] border border-[color:var(--line)] hover:bg-[color:var(--accent-soft)] transition"
                  >
                    Denser visual elements
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(trimmedDraft + " - I meant more weight in the composition");
                      setInterventionMessage(null);
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs text-[color:var(--ink)] border border-[color:var(--line)] hover:bg-[color:var(--accent-soft)] transition"
                  >
                    More weight in the composition
                  </button>
                </>
              )}
              {interventionMessage.includes("multiple emotions") && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(trimmedDraft + " - The dominant emotion should be loneliness");
                      setInterventionMessage(null);
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs text-[color:var(--ink)] border border-[color:var(--line)] hover:bg-[color:var(--accent-soft)] transition"
                  >
                    Loneliness
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(trimmedDraft + " - The dominant emotion should be hope");
                      setInterventionMessage(null);
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs text-[color:var(--ink)] border border-[color:var(--line)] hover:bg-[color:var(--accent-soft)] transition"
                  >
                    Hope
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(trimmedDraft + " - The dominant emotion should be anxiety");
                      setInterventionMessage(null);
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs text-[color:var(--ink)] border border-[color:var(--line)] hover:bg-[color:var(--accent-soft)] transition"
                  >
                    Anxiety
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(trimmedDraft + " - The dominant emotion should be calm");
                      setInterventionMessage(null);
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs text-[color:var(--ink)] border border-[color:var(--line)] hover:bg-[color:var(--accent-soft)] transition"
                  >
                    Calm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(trimmedDraft + " - The dominant emotion should be excitement");
                      setInterventionMessage(null);
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs text-[color:var(--ink)] border border-[color:var(--line)] hover:bg-[color:var(--accent-soft)] transition"
                  >
                    Excitement
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="rounded-[24px] border border-[color:var(--line)] bg-white/70 px-5 py-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            How this works
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs leading-5">
            <div>
              <p className="font-semibold text-[color:var(--ink)] mb-1">Your role</p>
              <ul className="space-y-1 text-[color:var(--muted)]">
                <li>— Describe the experience in your own words</li>
                <li>— Correct the emotion tags or metaphors if they feel wrong</li>
                <li>— Answer the coach's follow-up to steer the next sketch</li>
                <li>— Send follow-ups to refine, not replace, the sketch</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-[color:var(--ink)] mb-1">AI Coach role</p>
              <ul className="space-y-1 text-[color:var(--muted)]">
                <li>— Interpret your words into visual metaphors</li>
                <li>— Generate and repair p5.js code</li>
                <li>— Explain its key interpretive choices</li>
                <li>— Ask one question per turn to reduce guessing</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[color:var(--line)] pt-3">
            <p className="text-xs font-semibold text-[color:var(--muted)] mb-1">AI limitations</p>
            <p className="text-xs leading-5 text-[color:var(--muted)]">
              The AI only sees what you type — it has no memory of previous sessions and cannot view your screen.
              It reads at most the last 6 messages. Ambiguous or conflicting input may produce an unexpected sketch;
              use the editable tags to correct it rather than starting over.
            </p>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[color:var(--line)] bg-white/55 p-5 text-sm leading-6 text-[color:var(--muted)]">
            Start with a personal moment, like feeling lonely in a crowd or finally
            feeling at peace. Follow-up prompts can refine the current sketch.
          </div>
        ) : (
          messages.map((message) => {
            const isLatestAssistant = message.id === lastAssistantMessageId;
            const payload = message.assistantPayload;

            // For the latest assistant message, use editedContext overrides if present
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
                            <span
                              key={metaphor}
                              className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-medium text-[color:var(--ink)]"
                            >
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
                            <span
                              key={emotion}
                              className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs font-medium text-[color:var(--ink)]"
                            >
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
                        <p className="text-sm leading-6 text-[color:var(--ink)]">
                          {payload.interpretationNote}
                        </p>
                      </div>
                    )}

                    {payload.followUpQuestion && (
                      <div className="rounded-[16px] border border-[color:var(--accent)] bg-[color:var(--accent-soft)] px-4 py-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                          Coach asks
                        </p>
                        <p className="text-sm leading-6 text-[color:var(--ink)]">
                          {payload.followUpQuestion}
                        </p>
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
        <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
          <span>{characterCount}/600</span>
          {visibleError ? (
            <span className="font-medium text-[color:var(--warning)]">{visibleError}</span>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={loading || !trimmedDraft || isOverLimit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading && (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {loading ? LOADING_STAGES[loadingStageIndex] : "Generate sketch"}
        </button>
      </form>
    </section>
  );
}
