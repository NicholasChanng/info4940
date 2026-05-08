import type { SketchValidationResult, HateSymbolCheckResult } from "@/lib/types";

// Explicit hate symbol references in generated code (comments, variable names, strings).
// Geometric construction patterns (4-fold rotation + line) are intentionally excluded
// here because they produce too many false positives on innocent shapes (snowflakes,
// mandalas, flowers). The input-layer jailbreak detector handles the construction vector.
const HATE_SYMBOL_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /swastika/i, reason: "Code references a prohibited hate symbol." },
  { pattern: /hakenkreuz/i, reason: "Code references a prohibited hate symbol." },
  {
    pattern: /\bss\s*(?:bolt|rune|insignia|symbol)\b/i,
    reason: "Code references a prohibited hate symbol.",
  },
];

export function detectHateSymbolPatterns(code: string): HateSymbolCheckResult {
  for (const { pattern, reason } of HATE_SYMBOL_PATTERNS) {
    if (pattern.test(code)) {
      return { blocked: true, reason };
    }
  }
  return { blocked: false };
}

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
