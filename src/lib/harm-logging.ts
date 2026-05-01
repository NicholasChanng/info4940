// Harm 1 & 2: Structured server-side logging for cultural and disability prompts.
//
// Without a database, cross-session dissatisfaction rates cannot be computed.
// These logs produce an auditable trail that a developer or external reviewer
// can query. Each log entry is self-contained so grep / log-aggregation tools
// can reconstruct per-category regeneration counts.

// Harm 1 keywords — cultural traditions, ceremonies, heritage
const CULTURAL_KEYWORDS: string[] = [
  "indigenous", "native american", "first nations", "ceremony", "ritual",
  "tradition", "heritage", "ancestral", "tribal", "cultural", "culture",
  "fiesta", "festival", "diaspora", "folk", "spiritual practice",
  "pow wow", "shaman", "sacred", "altar", "offering",
  "hanbok", "kimono", "sari", "dashiki", "hijab",
  "diwali", "lunar new year", "ramadan", "eid", "hanukkah", "kwanzaa",
];

// Harm 2 keywords — disability, chronic illness, neurodivergence
const DISABILITY_KEYWORDS: string[] = [
  "disability", "disabled", "wheelchair", "chronic pain", "chronic illness",
  "blind", "blindness", "deaf", "deafness", "hard of hearing",
  "autism", "autistic", "adhd", "dyslexia",
  "paralyzed", "paralysis", "amputee", "prosthetic",
  "mental illness", "depression", "anxiety disorder", "ptsd",
  "lupus", "fibromyalgia", "multiple sclerosis", "ms",
  "cerebral palsy", "down syndrome",
];

function matchKeywords(prompt: string, keywords: string[]): string[] {
  const lower = prompt.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw));
}

// Harm 2: estimate palette darkness using perceived luminance of each hex color.
// Returns fraction of palette entries whose luminance falls below the threshold.
function darkFraction(palette: Array<{ hex: string }>): number {
  if (palette.length === 0) return 0;

  let darkCount = 0;
  for (const { hex } of palette) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    // Perceived luminance (WCAG formula)
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luminance < 0.35) darkCount++;
  }
  return darkCount / palette.length;
}

export interface HarmLogContext {
  prompt: string;
  messageCount: number;
  palette: Array<{ emotion: string; hex: string }>;
  visualMetaphors: string[];
}

export function logHarms(ctx: HarmLogContext): void {
  const culturalMatches = matchKeywords(ctx.prompt, CULTURAL_KEYWORDS);
  const disabilityMatches = matchKeywords(ctx.prompt, DISABILITY_KEYWORDS);

  // Harm 1: cultural stereotype logging
  if (culturalMatches.length > 0) {
    console.log(JSON.stringify({
      harmType: "cultural-stereotype-watch",
      keywords: culturalMatches,
      // messageCount > 1 on the same topic suggests a regenerate (dissatisfaction proxy)
      possibleRegenerate: ctx.messageCount > 1,
      messageCount: ctx.messageCount,
      timestamp: new Date().toISOString(),
    }));
  }

  // Harm 2: disability representation logging
  if (disabilityMatches.length > 0) {
    const fraction = darkFraction(ctx.palette);
    const darkPalette = fraction >= 0.6;
    const tragedyMetaphors = ctx.visualMetaphors.some((m) => {
      const lower = m.toLowerCase();
      return ["broken", "shattered", "dark", "void", "collapse", "falling", "isolated", "trapped"].some((t) => lower.includes(t));
    });

    console.log(JSON.stringify({
      harmType: "disability-representation-watch",
      keywords: disabilityMatches,
      darkPaletteFraction: fraction.toFixed(2),
      darkPaletteFlag: darkPalette,
      tragedyMetaphorFlag: tragedyMetaphors,
      palette: ctx.palette,
      visualMetaphors: ctx.visualMetaphors,
      timestamp: new Date().toISOString(),
    }));
  }
}
