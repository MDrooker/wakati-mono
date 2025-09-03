/**
 * Shared types and enums for Amazon Polly integration
 * This file centralizes type definitions to avoid circular dependencies
 */


export enum TranscribeLanguage {
  EN_US = 'en-US',
  EN_GB = 'en-GB',
  ES_ES = 'es-ES',
  ES_US = 'es-US',
  FR_FR = 'fr-FR',
  DE_DE = 'de-DE',
  IT_IT = 'it-IT',
  PT_BR = 'pt-BR',
  JA_JP = 'ja-JP',
  KO_KR = 'ko-KR',
  ZH_CN = 'zh-CN',
}

export enum PollyVoiceId {
  JOANNA = 'Joanna',
  MATTHEW = 'Matthew',
  IVY = 'Ivy',
  JUSTIN = 'Justin',
  KENDRA = 'Kendra',
  KIMBERLY = 'Kimberly',
  SALLI = 'Salli',
  JOEY = 'Joey',
  AMY = 'Amy',
  BRIAN = 'Brian',
  EMMA = 'Emma',
}

export enum PollySpeakingStyle {
  NEWSCASTER = 'newscaster',
  CONVERSATIONAL = 'conversational',
}

export enum PollyEngine {
  NEURAL = 'neural',
  STANDARD = 'standard',
}



// Additional shared interfaces can be added here as needed
export interface AudioResult {
  // Storage fields aligned with Asset entity conventions
  storageKey?: string; // S3/Storage key
  bucket?: string; // Optional bucket name
  region?: string; // Optional region
  cdnRootUrl?: string; // Optional CDN root URL (cloudfront or direct)
  duration?: number;
  metadata: {
    voiceId: string;
    service: string;
    language: string;
    outputFormat: string;
    textLength: number;
    requestId?: string;
    model: string;
    speakingStyle?: string;
    engine?: string;
  };
}

export interface PollyTranscriptionRequest {
  text: string;
  voiceId: string;
  language: string;
  outputFormat?: string;
  engine?: PollyEngine;
  speakingStyle?: PollySpeakingStyle;
  /**
   * Explicitly indicate whether the provided text is plain text or SSML.
   * If omitted, service will default to 'text' unless it auto-detects a <speak> wrapper in future enhancements.
   */
  textType?: 'text' | 'ssml';
}
