import type { InterventionTrigger, InterventionResponse } from './types';

const AMBIGUITY_KEYWORDS = [
  'heavier', 'lighter', 'stronger', 'weaker', 'faster', 'slower', 
  'brighter', 'darker', 'warmer', 'colder', 'bigger', 'smaller',
  'more', 'less', 'different', 'better', 'worse'
];

const EMOTION_KEYWORDS = [
  'happy', 'sad', 'angry', 'scared', 'surprised', 'disgusted', 'neutral',
  'lonely', 'excited', 'calm', 'anxious', 'hopeful', 'frustrated', 'peaceful'
];


function extractAmbiguousWord(userInput: string): string | null {
  const words = userInput.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (AMBIGUITY_KEYWORDS.includes(word)) {
      return word;
    }
  }
  return null;
}

export function detectInterventionTriggers(userInput: string): InterventionTrigger[] {
  const triggers: InterventionTrigger[] = [];
  
  // Check for ambiguity
  const ambiguityMatches = AMBIGUITY_KEYWORDS.filter(keyword => 
    userInput.toLowerCase().includes(keyword)
  );
  
  if (ambiguityMatches.length > 0) {
    triggers.push({
      type: 'ambiguity',
      confidence: Math.min(0.8, ambiguityMatches.length * 0.3),
      context: `Ambiguous terms detected: ${ambiguityMatches.join(', ')}`
    });
  }
  
  // Check for multiple emotions
  const emotionMatches = EMOTION_KEYWORDS.filter(emotion => 
    userInput.toLowerCase().includes(emotion)
  );
  
  if (emotionMatches.length > 1) {
    triggers.push({
      type: 'multiple-emotions',
      confidence: Math.min(0.9, emotionMatches.length * 0.3),
      context: `Multiple emotions detected: ${emotionMatches.join(', ')}`
    });
  }
  
  
  return triggers;
}

export function generateInterventionResponse(trigger: InterventionTrigger, userInput?: string): InterventionResponse {
  switch (trigger.type) {
    case 'ambiguity':
      // Extract the actual ambiguous word from the user input
      const ambiguousWord = extractAmbiguousWord(userInput || '');
      const baseMessage = ambiguousWord 
        ? `I want to make sure I understand your vision. When you say '${ambiguousWord}', do you mean:`
        : "I want to make sure I understand your vision. When you say that, do you mean:";
      
      return {
        message: baseMessage,
        options: [
          "Slower movement and pacing",
          "Darker colors and tones", 
          "Denser visual elements",
          "More weight in the composition"
        ],
        requiresUserInput: true,
        followUpAction: 'clarify'
      };
      
    case 'multiple-emotions':
      return {
        message: "I detect multiple emotions in your description. Which emotion should be the dominant feeling in this sketch?",
        options: ["Loneliness", "Hope", "Anxiety", "Calm", "Excitement"],
        requiresUserInput: true,
        followUpAction: 'clarify'
      };
      
      
    case 'post-action-explanation':
      return {
        message: "I interpreted your emotion as slow, isolated circles because that's a common visual metaphor for loneliness. Does this capture your specific experience, or should I adjust the approach?",
        requiresUserInput: true,
        followUpAction: 'explain'
      };
      
    default:
      return {
        message: "I'm not sure I understand your vision. Could you clarify what you'd like to change?",
        requiresUserInput: true,
        followUpAction: 'correct'
      };
  }
}

export function shouldIntervene(triggers: InterventionTrigger[], userInput?: string): boolean {
  // Don't intervene if the user has already clarified their meaning
  // Check if the input contains clarification phrases
  const clarificationPhrases = [
    'i meant', 'i was referring to', 'specifically', 'in other words', 
    'to clarify', 'what i mean is', 'by that i mean',
    'the dominant emotion should be', 'i want to focus on', 'mainly about',
    'primarily about', 'mostly about', 'should be about'
  ];
  
  // Check if input already contains clarification
  if (userInput) {
    const hasClarification = clarificationPhrases.some(phrase => 
      userInput.toLowerCase().includes(phrase)
    );
    
    // If already clarified, don't intervene
    if (hasClarification) {
      return false;
    }
  }
  
  // Otherwise, intervene on moderate confidence
  return triggers.some(trigger => trigger.confidence > 0.5);
}
