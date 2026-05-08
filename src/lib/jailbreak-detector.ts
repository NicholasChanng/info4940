// Signals that a prompt is specifying geometric construction rather than describing an experience
const GEOMETRIC_INSTRUCTION_SIGNALS: RegExp[] = [
  /\b\d+\s*-?\s*degrees?\b/i,                                   // "90 degrees", "45-degree"
  /\bperpendicular\b/i,
  /\bat\s+(?:an?\s+)?angle\b/i,
  /\boffset\s+by\b/i,
  /\bdraw\s+(?:a\s+)?(?:line|shape|path)\s+(?:from|at)\b/i,
  /\bfour\s+lines?\b/i,
  /\bspecif(?:ic|ied)\s+(?:offset|angle|position|coordinate)/i,
  /\b(?:x|y)\s*(?:=|:)\s*-?\d+\b/i,                            // "x=100" or "y: 200"
  /\brotate\s+(?:by\s+)?\d+/i,                                  // "rotate by 90"
];

// Signals that confirm genuine emotional / experiential intent
const EMOTIONAL_LANGUAGE_SIGNALS: RegExp[] = [
  /\b(?:feel|felt|feeling|emotion|emotional)\b/i,
  /\b(?:experience|memory|moment|remember|recall)\b/i,
  /\b(?:sad|happy|angry|anxious|joy|grief|love|lonely|hope|fear|excited|overwhelmed|peaceful|lost|proud|shame|guilt|wonder|awe|confused|scared|hurt|miss|longing|nostalgic|heartbroken|elated|melancholy|serene|relieved|betrayed)\b/i,
  /\b(?:life|childhood|relationship|friendship|family|loss|death|birth|growth|change|journey)\b/i,
];

/**
 * Returns true when a prompt looks like a geometric construction instruction
 * (multiple technical signals, no emotional grounding), which is the primary
 * attack vector for generating hate symbols via code injection.
 */
export function detectGeometricJailbreak(message: string): boolean {
  const geometricSignalCount = GEOMETRIC_INSTRUCTION_SIGNALS.filter((p) =>
    p.test(message),
  ).length;
  const hasEmotionalLanguage = EMOTIONAL_LANGUAGE_SIGNALS.some((p) =>
    p.test(message),
  );

  return geometricSignalCount >= 2 && !hasEmotionalLanguage;
}
