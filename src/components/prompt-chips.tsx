"use client";

import { useState } from "react";

interface PromptChipsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

export function PromptChips({ prompts, onSelect }: PromptChipsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="rounded-full border border-[color:var(--line)] bg-white/75 px-3 py-1.5 text-xs font-medium text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--ink)]"
      >
        Examples
      </button>

      {open && (
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="absolute left-0 top-full z-50 w-96 pt-1"
        >
        <div className="rounded-[18px] border border-[color:var(--line)] bg-white/95 p-2 shadow-[0_8px_32px_rgba(18,34,41,0.12)] backdrop-blur">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                onSelect(prompt);
                setOpen(false);
              }}
              className="w-full rounded-[12px] px-3 py-2 text-left text-sm text-[color:var(--ink)] transition hover:bg-[color:var(--accent-soft)]"
            >
              {prompt}
            </button>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}
