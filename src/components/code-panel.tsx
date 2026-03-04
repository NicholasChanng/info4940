"use client";

import { useEffect, useState } from "react";

import type { PaletteEntry } from "@/lib/types";

interface CodePanelProps {
  code: string | null;
  palette: PaletteEntry[];
  emotionTags: string[];
}

export function CodePanel({ code, palette, emotionTags }: CodePanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    setCopyState("idle");
  }, [code]);

  async function handleCopy() {
    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className="flex min-h-[520px] flex-col rounded-[28px] border border-white/55 bg-[color:var(--card)] p-5 shadow-[0_24px_80px_rgba(18,34,41,0.12)] backdrop-blur lg:min-h-[560px]">
      <div className="flex items-start justify-between gap-4 border-b border-[color:var(--line)] pb-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--muted)]">
            Code Output
          </p>
          <h2 className="text-3xl leading-tight">Read-only sketch code</h2>
          <p className="text-sm leading-6 text-[color:var(--muted)]">
            Use this panel to see how the AI translated your prompt into p5.js.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!code}
          className="rounded-full border border-[color:var(--line)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copyState === "copied"
            ? "Copied"
            : copyState === "failed"
              ? "Retry copy"
              : "Copy code"}
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-[24px] border border-[color:var(--line)] bg-white/72 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Emotion Palette
          </p>
          {palette.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {palette.map((entry) => (
                <div
                  key={entry.emotion}
                  className="flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white px-3 py-2 text-xs font-medium text-[color:var(--ink)]"
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: entry.hex }}
                    aria-hidden="true"
                  />
                  <span>{entry.emotion}</span>
                  <code>{entry.hex}</code>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--muted)]">
              No direct palette matches yet. The next response may infer a clearer emotion signal.
            </p>
          )}
        </div>

        <div className="rounded-[24px] border border-[color:var(--line)] bg-white/72 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Emotion Tags
          </p>
          {emotionTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {emotionTags.map((emotion) => (
                <span
                  key={emotion}
                  className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs font-medium text-[color:var(--ink)]"
                >
                  {emotion}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--muted)]">
              Detected emotions will appear here after the first response.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[24px] border border-[color:var(--line)] bg-[#10191d]">
        {code ? (
          <pre className="h-full overflow-auto p-4 text-xs leading-6 text-[#d8efe7]">
            <code>{code}</code>
          </pre>
        ) : (
          <div className="flex h-full min-h-[340px] items-center justify-center p-6 text-center text-sm leading-6 text-[#a6c1b8]">
            Generated p5.js code will appear here after the assistant responds.
          </div>
        )}
      </div>
    </section>
  );
}
