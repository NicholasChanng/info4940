export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export interface PaletteEntry {
  emotion: string;
  hex: string;
}

export interface ChatResponse {
  explanation: string;
  visualMetaphors: string[];
  emotionTags: string[];
  colorPalette: PaletteEntry[];
  p5Code: string;
  repairApplied: boolean;
  followUpQuestion: string;
  interpretationNote: string;
}

export interface ModelSketchResponse {
  explanation: string;
  visualMetaphors: string[];
  emotionTags: string[];
  p5Code: string;
  followUpQuestion: string;
  interpretationNote: string;
}

export interface SketchValidationResult {
  ok: boolean;
  errors: string[];
}

export interface ApiErrorResponse {
  error: string;
}

export interface UIChatMessage extends ChatMessage {
  assistantPayload?: ChatResponse;
}

export interface UserContext {
  emotionTags?: string[];
  visualMetaphors?: string[];
}

export interface ChatRequest {
  messages: ChatMessage[];
  currentSketchCode?: string;
  userContext?: UserContext;
}

export interface PreviewMessagePayload {
  source: string;
  type: "runtime-error";
  message: string;
}
