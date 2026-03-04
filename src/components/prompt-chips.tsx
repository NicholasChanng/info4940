interface PromptChipsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

export function PromptChips({ prompts, onSelect }: PromptChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          className="rounded-full border border-[color:var(--line)] bg-white/75 px-3 py-2 text-left text-sm font-medium text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
