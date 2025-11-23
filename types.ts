export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  ERROR = 'ERROR',
  ADMIN = 'ADMIN' 
}

export interface VoiceMetrics {
  clarity: number;
  charisma: number;
  uniqueness: number;
  stability: number;
  warmth: number;
}

export interface TechnicalDetails {
  pitchRange: string; // e.g. "Low Baritone"
  speakingPace: string; // e.g. "Measured (~140 wpm)"
  expressiveness: string; // e.g. "Monotone" or "Dynamic"
}

export interface VoiceAnalysisResult {
  overallScore: number;
  voiceArchetype: string; 
  estimatedAge: string; 
  estimatedWeight: string; 
  roast: string; 
  encouragement: string; 
  pros: string[];
  cons: string[];
  similarVoice: string; 
  metrics: VoiceMetrics; 
  technical: TechnicalDetails;
}

export interface VoiceRecord {
  id: string;
  timestamp: number;
  analysis: VoiceAnalysisResult;
  ip?: string;
  userAgent?: string;
}