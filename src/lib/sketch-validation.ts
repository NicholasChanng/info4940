import type { SketchValidationResult } from "@/lib/types";

// --- Harm 6: Static AST gate ---
// Blocks dangerous browser APIs that have no place in a p5.js creative sketch
// and could be used to exfiltrate data or execute arbitrary code.
const bannedPatterns: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\beval\s*\(/, reason: "Do not use eval()." },
  { pattern: /\bFunction\s*\(/, reason: "Do not use the Function constructor." },
  { pattern: /\bfetch\s*\(/, reason: "Do not make network requests." },
  { pattern: /\bXMLHttpRequest\b/, reason: "Do not use XMLHttpRequest." },
  { pattern: /\blocalStorage\b/, reason: "Do not use localStorage." },
  { pattern: /\bsessionStorage\b/, reason: "Do not use sessionStorage." },
  { pattern: /\bindexedDB\b/, reason: "Do not use IndexedDB." },
  { pattern: /\bdocument\.cookie\b/, reason: "Do not access document.cookie." },
  { pattern: /\bdocument\.write\s*\(/, reason: "Do not write raw HTML." },
  { pattern: /\binnerHTML\s*=/, reason: "Do not set innerHTML." },
  { pattern: /\bouterHTML\s*=/, reason: "Do not set outerHTML." },
  { pattern: /\binsertAdjacentHTML\s*\(/, reason: "Do not use insertAdjacentHTML." },
  { pattern: /\bwindow\.location\b/, reason: "Do not access window.location." },
  { pattern: /\bwindow\.parent\b/, reason: "Do not access window.parent." },
  { pattern: /\bnew\s+WebSocket\s*\(/, reason: "Do not use WebSocket." },
  { pattern: /\bnew\s+Worker\s*\(/, reason: "Do not use Worker." },
  { pattern: /^\s*import\s/m, reason: "Do not use imports." },
  { pattern: /^\s*export\s/m, reason: "Do not use exports." },
  { pattern: /<\s*(?:html|body|script|canvas|iframe)\b/i, reason: "Return JavaScript only, not HTML." },
];

// --- Harm 3: Hate symbol detection ---
// Layer 1 – explicit text: comments or identifiers naming prohibited symbols.
const HATE_SYMBOL_TERMS = [
  "swastika", "hakenkreuz", "nazi", "nsdap", "kkk", "ku klux",
  "white power", "white supremac", "14 words", "88", "heil",
  "iron cross", "black sun", "sonnenrad", "totenkopf",
];

// Layer 2 – geometric fingerprint: four 90-degree rotations with line() calls.
// This matches the specific jailbreak vector described in the harm assessment:
// "draw four lines at 90-degree angles with specific offsets."
const SWASTIKA_ROTATION_PATTERN = /for\s*\([^)]*[4-9]\s*\)[^{]*\{[^}]*rotate\s*\([^)]*(?:HALF_PI|PI\s*\/\s*2|Math\.PI\s*\/\s*2|1\.57)[^)]*\)[^}]*line\s*\(/i;
const REPEATED_90_DEG_ROTATIONS = /(?:rotate\s*\([^)]*(?:HALF_PI|PI\s*\/\s*2|Math\.PI\s*\/\s*2)[^)]*\)[^;]*;[^;]*){3}/i;

function detectHateSymbol(code: string): boolean {
  const lower = code.toLowerCase();

  // Layer 1: named symbols in any token (comments, strings, identifiers)
  if (HATE_SYMBOL_TERMS.some((term) => lower.includes(term))) return true;

  // Layer 2: geometric fingerprint
  if (SWASTIKA_ROTATION_PATTERN.test(code)) return true;
  if (REPEATED_90_DEG_ROTATIONS.test(code)) return true;

  return false;
}

export function validateSketchCode(code: string): SketchValidationResult {
  const errors: string[] = [];
  const trimmedCode = code.trim();

  if (!trimmedCode) {
    return { ok: false, errors: ["The sketch code is empty."] };
  }

  // Harm 3: hate symbol check — returns blocked immediately, no repair attempt
  if (detectHateSymbol(trimmedCode)) {
    return {
      ok: false,
      blocked: true,
      errors: ["Visual output blocked: the generated code attempts to render a restricted symbol."],
    };
  }

  if (!/\bsetup\s*\(/.test(trimmedCode)) {
    errors.push("The sketch must define setup().");
  }

  if (!/\bdraw\s*\(/.test(trimmedCode)) {
    errors.push("The sketch must define draw().");
  }

  for (const { pattern, reason } of bannedPatterns) {
    if (pattern.test(trimmedCode)) {
      errors.push(reason);
    }
  }

  try {
    new Function(trimmedCode);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The sketch contains invalid JavaScript.";
    errors.push(`Syntax error: ${message}`);
  }

  return { ok: errors.length === 0, errors };
}
