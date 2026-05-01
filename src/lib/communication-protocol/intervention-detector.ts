import { getEmotionColorEntries } from "@/lib/emotion-colors";
import type { InterventionTrigger, InterventionResponse } from './types';

const AMBIGUITY_KEYWORDS = [
  'heavier', 'lighter', 'stronger', 'weaker', 'faster', 'slower',
  'brighter', 'darker', 'warmer', 'colder', 'bigger', 'smaller',
  'more', 'less', 'different', 'better', 'worse'
];

// Merge the color-map emotions with a broader vocabulary so adding a new
// emotion to emotion-colors.json is automatically detected here too.
const EMOTION_KEYWORDS = [
  ...new Set([
    'happy', 'sad', 'angry', 'scared', 'surprised', 'disgusted', 'neutral',
    'lonely', 'excited', 'calm', 'anxious', 'hopeful', 'frustrated', 'peaceful',
    ...getEmotionColorEntries().map((e) => e.emotion),
  ]),
];

const CLARIFICATION_PHRASES = [
  'i meant', 'i was referring to', 'specifically', 'in other words',
  'to clarify', 'what i mean is', 'by that i mean',
  'the dominant emotion should be', 'i want to focus on', 'mainly about',
  'primarily about', 'mostly about', 'should be about',
];

function extractAmbiguousWord(lower: string): string | null {
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (AMBIGUITY_KEYWORDS.includes(word)) return word;
  }
  return null;
}

export function detectInterventionTriggers(userInput: string): InterventionTrigger[] {
  const lower = userInput.toLowerCase();
  const triggers: InterventionTrigger[] = [];

  const ambiguityMatches = AMBIGUITY_KEYWORDS.filter((keyword) => lower.includes(keyword));
  if (ambiguityMatches.length > 0) {
    triggers.push({
      type: 'ambiguity',
      confidence: Math.min(0.8, ambiguityMatches.length * 0.3),
      context: `Ambiguous terms detected: ${ambiguityMatches.join(', ')}`,
    });
  }

  const emotionMatches = EMOTION_KEYWORDS.filter((emotion) => lower.includes(emotion));
  if (emotionMatches.length > 1) {
    triggers.push({
      type: 'multiple-emotions',
      confidence: Math.min(0.9, emotionMatches.length * 0.3),
      context: `Multiple emotions detected: ${emotionMatches.join(', ')}`,
    });
  }

  return triggers;
}

export function generateInterventionResponse(trigger: InterventionTrigger, userInput?: string): InterventionResponse {
  switch (trigger.type) {
    case 'ambiguity': {
      const ambiguousWord = userInput ? extractAmbiguousWord(userInput.toLowerCase()) : null;
      const message = ambiguousWord
        ? `I want to make sure I understand your vision. When you say '${ambiguousWord}', do you mean:`
        : "I want to make sure I understand your vision. When you say that, do you mean:";
      return {
        message,
        options: ['Slower movement and pacing', 'Darker colors and tones', 'Denser visual elements', 'More weight in the composition'],
        optionSuffix: 'I meant',
        requiresUserInput: true,
        followUpAction: 'clarify',
      };
    }

    case 'multiple-emotions':
      return {
        message: "I detect multiple emotions in your description. Which emotion should be the dominant feeling in this sketch?",
        options: ['Loneliness', 'Hope', 'Anxiety', 'Calm', 'Excitement'],
        optionSuffix: 'The dominant emotion should be',
        requiresUserInput: true,
        followUpAction: 'clarify',
      };

    case 'post-action-explanation':
      return {
        message: trigger.context || "I interpreted your emotion as slow, isolated circles because that's a common visual metaphor for loneliness. Does this capture your specific experience, or should I adjust the approach?",
        requiresUserInput: true,
        followUpAction: 'explain',
      };

    default:
      return {
        message: "I'm not sure I understand your vision. Could you clarify what you'd like to change?",
        requiresUserInput: true,
        followUpAction: 'correct',
      };
  }
}

export function shouldIntervene(triggers: InterventionTrigger[], userInput?: string): boolean {
  if (userInput) {
    const lower = userInput.toLowerCase();
    if (CLARIFICATION_PHRASES.some((phrase) => lower.includes(phrase))) return false;
  }
  return triggers.some((trigger) => trigger.confidence > 0.5);
}
