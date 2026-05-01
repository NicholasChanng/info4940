export interface InterventionTrigger {
  type: 'ambiguity' | 'multiple-emotions' | 'post-action-explanation';
  confidence: number;
  context: string;
}

export interface InterventionResponse {
  message: string;
  options?: string[];
  requiresUserInput: boolean;
  followUpAction?: 'clarify' | 'explain' | 'correct';
}

export interface CommunicationLog {
  timestamp: number;
  userId: string;
  trigger: InterventionTrigger;
  response: InterventionResponse;
  userAction: string;
  outcome: 'success' | 'failure' | 'partial';
}