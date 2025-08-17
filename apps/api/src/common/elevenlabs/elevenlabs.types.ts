import { registerEnumType } from '@nestjs/graphql';

/**
 * 11Labs Voice IDs
 * These represent available voices in ElevenLabs
 */
export enum ElevenLabsVoiceId {
  // Default voices
  RACHEL = 'Rachel',
  DOMI = 'Domi',
  BELLA = 'Bella',
  ANTONI = 'Antoni',
  ELLI = 'Elli',
  JOSH = 'Josh',
  ARNOLD = 'Arnold',
  ADAM = 'Adam',
  SAM = 'Sam',
  // Professional voices
  SERENA = 'Serena',
  ETHAN = 'Ethan',
  CHARLOTTE = 'Charlotte',
  DANIEL = 'Daniel',
  LIAM = 'Liam',
  DOROTHY = 'Dorothy',
  JEREMY = 'Jeremy',
  JOSEPH = 'Joseph',
  MICHAEL = 'Michael',
  SARAH = 'Sarah',
  // News/broadcast voices
  ALICE = 'Alice',
  BILL = 'Bill',
  BRIAN = 'Brian',
  CHRIS = 'Chris',
  EMMA = 'Emma',
  ERIC = 'Eric',
  GEORGE = 'George',
  GRACE = 'Grace',
  MATILDA = 'Matilda',
  NICOLE = 'Nicole',
}

/**
 * ElevenLabs Model IDs for text-to-speech
 */
export enum ElevenLabsModel {
  ELEVEN_MONOLINGUAL_V1 = 'eleven_monolingual_v1',
  ELEVEN_MULTILINGUAL_V1 = 'eleven_multilingual_v1',
  ELEVEN_MULTILINGUAL_V2 = 'eleven_multilingual_v2',
  ELEVEN_TURBO_V2 = 'eleven_turbo_v2',
  ELEVEN_TURBO_V2_5 = 'eleven_turbo_v2_5',
  ELEVEN_FLASH_V2 = 'eleven_flash_v2',
  ELEVEN_FLASH_V2_5 = 'eleven_flash_v2_5',
  ELEVEN_V3 = 'eleven_V3',
}

/**
 * ElevenLabs Output Formats
 */
export enum ElevenLabsOutputFormat {
  MP3_22050_32 = 'mp3_22050_32',
  MP3_44100_32 = 'mp3_44100_32',
  MP3_44100_64 = 'mp3_44100_64',
  MP3_44100_96 = 'mp3_44100_96',
  MP3_44100_128 = 'mp3_44100_128',
  MP3_44100_192 = 'mp3_44100_192',
  PCM_16000 = 'pcm_16000',
  PCM_22050 = 'pcm_22050',
  PCM_24000 = 'pcm_24000',
  PCM_44100 = 'pcm_44100',
  ULAW_8000 = 'ulaw_8000',
}

/**
 * ElevenLabs Voice Settings
 */
export interface ElevenLabsVoiceSettings {
  stability: number; // 0.0 to 1.0
  similarity_boost: number; // 0.0 to 1.0
  style?: number; // 0.0 to 1.0 (optional)
  use_speaker_boost?: boolean; // (optional)
}

/**
 * ElevenLabs Pronunciation Dictionary Settings
 */
export interface ElevenLabsPronunciationDictionary {
  locator_id: string;
  version_id: string;
}

/**
 * ElevenLabs Speech Synthesis Request
 */
export interface ElevenLabsSynthesisRequest {
  text: string;
  voice_id: ElevenLabsVoiceId;
  model_id?: ElevenLabsModel;
  voice_settings?: ElevenLabsVoiceSettings;
  pronunciation_dictionary_locators?: ElevenLabsPronunciationDictionary[];
  seed?: number;
  previous_text?: string;
  next_text?: string;
  previous_request_ids?: string[];
  next_request_ids?: string[];
  output_format?: ElevenLabsOutputFormat;
  optimize_streaming_latency?: number; // 0-4
  enable_logging?: boolean;
  apply_text_normalization?: 'auto' | 'on' | 'off';
}

/**
 * ElevenLabs Audio Result
 */
export interface ElevenLabsAudioResult {
  audio: Buffer;
  contentType: string;
  historyItemId?: string;
  bucket: string;
  region: string;
  storageKey: string;
  cdnRootUrl: string;
  duration?: number;
  audioSize?: number;
}

/**
 * ElevenLabs API Response for Voice Info
 */
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  samples?: any[];
  category: string;
  fine_tuning?: {
    model_id?: string;
    is_allowed_to_fine_tune?: boolean;
    fine_tuning_progress?: any;
    message?: any;
    dataset_duration_seconds?: number;
    verification_attempts?: any[];
    verification_failures?: string[];
    verification_attempts_count?: number;
    slice_ids?: string[];
  };
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
  available_for_tiers?: string[];
  settings?: ElevenLabsVoiceSettings;
  sharing?: any;
  high_quality_base_model_ids?: string[];
  safety_control?: 'MOST_STRICT' | 'STRICT' | 'MODERATE' | 'LEAST_STRICT';
  voice_verification?: {
    requires_verification: boolean;
    is_verified: boolean;
    verification_attempts?: any[];
    verification_failures?: string[];
    verification_attempts_count?: number;
  };
  permission_on_resource?: any;
}

/**
 * ElevenLabs Usage Information
 */
export interface ElevenLabsUsage {
  quota_limit_characters: number;
  quota_usage_characters: number;
  can_extend_character_limit: boolean;
  allowed_to_extend_character_limit: boolean;
  next_character_count_reset_unix: number;
  voice_limit: number;
  professional_voice_limit: number;
  can_extend_voice_limit: boolean;
  can_use_instant_voice_cloning: boolean;
  can_use_professional_voice_cloning: boolean;
  currency: string;
  state: string;
  has_open_invoices: boolean;
  available_models: any[];
  invoice_details?: any;
}

/**
 * Transcription Service Provider Enum
 */
export enum TranscriptionService {
  POLLY = 'polly',
  ELEVENLABS = 'elevenlabs',
}

// Register GraphQL enums
registerEnumType(ElevenLabsVoiceId, {
  name: 'ElevenLabsVoiceId',
  description: 'Available ElevenLabs voice identifiers',
});

registerEnumType(ElevenLabsModel, {
  name: 'ElevenLabsModel',
  description: 'ElevenLabs text-to-speech models',
});

registerEnumType(ElevenLabsOutputFormat, {
  name: 'ElevenLabsOutputFormat',
  description: 'ElevenLabs audio output formats',
});

registerEnumType(TranscriptionService, {
  name: 'TranscriptionService',
  description: 'Available transcription service providers',
});
