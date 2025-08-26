// Shared type definitions for the application

export interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  questionType?: 'multiple-choice' | 'open-ended' | 'scale';
  options?: string[];
  scaleInfo?: {
    min: number;
    max: number;
    min_label: string;
    max_label: string;
  };
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: string[];
  isQuestion?: boolean;
}

export interface AssistantQuestion {
  question: string;
  type: 'multiple-choice' | 'open-ended' | 'scale';
  options?: string[];
  scale_info?: {
    min: number;
    max: number;
    min_label: string;
    max_label: string;
  };
}

export interface FrameworkScore {
  key: string;
  label: string;
  score: number; // 0-100
  summary?: string;
}

export interface EvaluationData {
  frameworks: FrameworkScore[];
  overall?: {
    persona?: string;
    summary?: string;
  };
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: {
    message: string;
  };
  threadId?: string;
  runId?: string;
  openai?: unknown;
}

export interface ErrorWithMessage {
  message: string;
}

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}
