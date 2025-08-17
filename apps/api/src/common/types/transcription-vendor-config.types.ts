/**
 * Vendor-specific configuration types for transcription services
 * This file defines the configuration interfaces that can be stored in the vendorConfig JSONB field
 */

import {
  PollyVoiceId,
  PollySpeakingStyle,
  PollyEngine,
} from '../aws/aws.polly.types';
import {
  ElevenLabsVoiceId,
  ElevenLabsModel,
  ElevenLabsOutputFormat,
  ElevenLabsVoiceSettings,
  TranscriptionService,
} from '../elevenlabs/elevenlabs.types';

/**
 * Amazon Polly specific configuration
 */
export interface PollyVendorConfig {
  service: TranscriptionService.POLLY;
  voiceId: PollyVoiceId;
  speakingStyle?: PollySpeakingStyle;
  engine: PollyEngine;
  // Additional Polly-specific metadata
  pollyMetadata?: any;
}

/**
 * ElevenLabs specific configuration
 */
export interface ElevenLabsVendorConfig {
  service: TranscriptionService.ELEVENLABS;
  voiceId: ElevenLabsVoiceId;
  model: ElevenLabsModel;
  outputFormat: ElevenLabsOutputFormat;
  voiceSettings?: ElevenLabsVoiceSettings;
  seed?: number;
  optimizeStreamingLatency?: number;
  enableLogging?: boolean;
  applyTextNormalization?: 'auto' | 'on' | 'off';
}

/**
 * Union type for all vendor configurations
 */
export type VendorConfig = PollyVendorConfig | ElevenLabsVendorConfig;

/**
 * Type guards to determine vendor configuration type
 */
export function isPollyVendorConfig(
  config: VendorConfig,
): config is PollyVendorConfig {
  return config.service === TranscriptionService.POLLY;
}

export function isElevenLabsVendorConfig(
  config: VendorConfig,
): config is ElevenLabsVendorConfig {
  return config.service === TranscriptionService.ELEVENLABS;
}

/**
 * Default vendor configurations
 */
export const DEFAULT_POLLY_CONFIG: PollyVendorConfig = {
  service: TranscriptionService.POLLY,
  voiceId: PollyVoiceId.JOANNA,
  engine: PollyEngine.NEURAL,
};

export const DEFAULT_ELEVENLABS_CONFIG: ElevenLabsVendorConfig = {
  service: TranscriptionService.ELEVENLABS,
  voiceId: ElevenLabsVoiceId.ALICE,
  model: ElevenLabsModel.ELEVEN_MULTILINGUAL_V2,
  outputFormat: ElevenLabsOutputFormat.MP3_44100_128,
  enableLogging: true,
};

/**
 * Validation function for vendor configurations
 */
export function validateVendorConfig(config: VendorConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (isPollyVendorConfig(config)) {
    if (!config.voiceId) {
      errors.push('Polly voice ID is required');
    }
    if (!config.engine) {
      errors.push('Polly engine is required');
    }
  } else if (isElevenLabsVendorConfig(config)) {
    if (!config.voiceId) {
      errors.push('ElevenLabs voice ID is required');
    }
    if (!config.model) {
      errors.push('ElevenLabs model is required');
    }
    if (!config.outputFormat) {
      errors.push('ElevenLabs output format is required');
    }

    if (config.voiceSettings) {
      const settings = config.voiceSettings;
      if (settings.stability < 0 || settings.stability > 1) {
        errors.push('ElevenLabs stability must be between 0 and 1');
      }
      if (settings.similarity_boost < 0 || settings.similarity_boost > 1) {
        errors.push('ElevenLabs similarity_boost must be between 0 and 1');
      }
      if (
        settings.style !== undefined &&
        (settings.style < 0 || settings.style > 1)
      ) {
        errors.push('ElevenLabs style must be between 0 and 1');
      }
    }

    if (
      config.optimizeStreamingLatency !== undefined &&
      (config.optimizeStreamingLatency < 0 ||
        config.optimizeStreamingLatency > 4)
    ) {
      errors.push(
        'ElevenLabs optimize_streaming_latency must be between 0 and 4',
      );
    }
  } else {
    errors.push('Unknown vendor configuration type');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
