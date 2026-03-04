import type { SketchValidationResult } from "@/lib/types";

const bannedPatterns: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\beval\s*\(/, reason: "Do not use eval()." },
  { pattern: /\bFunction\s*\(/, reason: "Do not use the Function constructor." },
  { pattern: /\bfetch\s*\(/, reason: "Do not make network requests." },
  { pattern: /\bXMLHttpRequest\b/, reason: "Do not use XMLHttpRequest." },
  { pattern: /\blocalStorage\b/, reason: "Do not use localStorage." },
  { pattern: /\bsessionStorage\b/, reason: "Do not use sessionStorage." },
  { pattern: /\bdocument\.write\s*\(/, reason: "Do not write raw HTML." },
  { pattern: /\bwindow\.parent\b/, reason: "Do not access window.parent." },
  { pattern: /^\s*import\s/m, reason: "Do not use imports." },
  { pattern: /^\s*export\s/m, reason: "Do not use exports." },
  { pattern: /<\s*(?:html|body|script|canvas|iframe)\b/i, reason: "Return JavaScript only, not HTML." },
];

export function validateSketchCode(code: string): SketchValidationResult {
  const errors: string[] = [];
  const trimmedCode = code.trim();

  if (!trimmedCode) {
    return {
      ok: false,
      errors: ["The sketch code is empty."],
    };
  }

  if (!/\bsetup\s*\(/.test(trimmedCode)) {
    errors.push("The sketch must define setup().");
  }

  if (!/\bdraw\s*\(/.test(trimmedCode)) {
    errors.push("The sketch must define draw().");
  }

  for (const bannedPattern of bannedPatterns) {
    if (bannedPattern.pattern.test(trimmedCode)) {
      errors.push(bannedPattern.reason);
    }
  }

  try {
    // Compile without executing to catch syntax problems before the browser preview.
    new Function(trimmedCode);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The sketch contains invalid JavaScript.";
    errors.push(`Syntax error: ${message}`);
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
