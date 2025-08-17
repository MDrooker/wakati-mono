import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../aws/aws.s3.service';
import { nanoid } from 'nanoid';
import { Readable, PassThrough } from 'stream';
import { pipeline } from 'stream/promises';
import {
  ElevenLabsVoiceId,
  ElevenLabsModel,
  ElevenLabsOutputFormat,
  ElevenLabsVoiceSettings,
  ElevenLabsSynthesisRequest,
  ElevenLabsAudioResult,
  ElevenLabsVoice,
  ElevenLabsUsage,
} from './elevenlabs.types';

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';
  private apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {
    this.apiKey = this.configService.get<string>('ELEVENLABS_API_KEY');
    if (this.apiKey) {
      this.logger.log('ElevenLabs service initialized successfully');
    } else {
      this.logger.warn('ElevenLabs API key not found. Set ELEVENLABS_API_KEY environment variable');
    }
  }

  /**
   * Check if ElevenLabs is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get default voice settings optimized for different use cases
   */
  private getDefaultVoiceSettings(
    voiceId: ElevenLabsVoiceId,
  ): ElevenLabsVoiceSettings {
    // News/broadcast voices get different settings
    const newsVoices = [
      ElevenLabsVoiceId.ALICE,
      ElevenLabsVoiceId.BILL,
      ElevenLabsVoiceId.BRIAN,
      ElevenLabsVoiceId.CHRIS,
    ];

    if (newsVoices.includes(voiceId)) {
      return {
        stability: 0.75,
        similarity_boost: 0.8,
        style: 0.25,
        use_speaker_boost: true,
      };
    }

    // Default settings for conversational voices
    return {
      stability: 0.5,
      similarity_boost: 0.7,
      style: 0.0,
      use_speaker_boost: false,
    };
  }

  /**
   * Get news-optimized voice settings for newscaster style
   */
  private getNewscasterVoiceSettings(): ElevenLabsVoiceSettings {
    return {
      stability: 0.8,
      similarity_boost: 0.85,
      style: 0.4,
      use_speaker_boost: true,
    };
  }

  /**
   * Synthesize speech from text using ElevenLabs API with timeout and retry handling
   */
  async synthesizeTextToSpeech(
    request: ElevenLabsSynthesisRequest,
    storageKey: string = 'transcriptions/elevenlabs/',
  ): Promise<ElevenLabsAudioResult> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs service is not properly configured. Set ELEVENLABS_API_KEY environment variable');
    }

    // For very long text, break it into chunks to reduce timeout risk
    const MAX_SAFE_LENGTH = 2500; // Characters
    if (request.text.length > MAX_SAFE_LENGTH) {
      this.logger.log(`Text length ${request.text.length} exceeds safe limit. Breaking into chunks.`);
      return await this.synthesizeLongText(request, storageKey);
    }

    try {
      this.logger.log(`Synthesizing speech with ElevenLabs for text length: ${request.text.length}`);

      // Prepare the synthesis request
      const voiceSettings = request.voice_settings || this.getDefaultVoiceSettings(request.voice_id);
      const modelId = request.model_id || ElevenLabsModel.ELEVEN_MULTILINGUAL_V2;
      const outputFormat = request.output_format || ElevenLabsOutputFormat.MP3_44100_128;

      const requestBody = {
        text: request.text,
        model_id: modelId,
        voice_settings: voiceSettings,
        output_format: outputFormat,
        optimize_streaming_latency: request.optimize_streaming_latency || 0,
        enable_logging: request.enable_logging !== false, // Default to true
        apply_text_normalization: request.apply_text_normalization || 'auto',
      };

      // Add optional parameters if provided
      if (request.pronunciation_dictionary_locators) {
        requestBody['pronunciation_dictionary_locators'] = request.pronunciation_dictionary_locators;
      }
      if (request.seed) {
        requestBody['seed'] = request.seed;
      }
      if (request.previous_text) {
        requestBody['previous_text'] = request.previous_text;
      }
      if (request.next_text) {
        requestBody['next_text'] = request.next_text;
      }
      if (request.previous_request_ids) {
        requestBody['previous_request_ids'] = request.previous_request_ids;
      }
      if (request.next_request_ids) {
        requestBody['next_request_ids'] = request.next_request_ids;
      }

      // Try synthesis with retry logic and timeout handling
      return await this.synthesizeWithRetry(requestBody, request.voice_id, storageKey, outputFormat);
    } catch (error) {
      this.logger.error('ElevenLabs synthesis failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle synthesis of very long text by breaking into chunks and concatenating
   */
  private async synthesizeLongText(
    request: ElevenLabsSynthesisRequest,
    storageKey: string,
  ): Promise<ElevenLabsAudioResult> {
    const chunks = this.breakTextIntoChunks(request.text, 2000); // Smaller chunks for safety
    this.logger.log(`Breaking text into ${chunks.length} chunks for synthesis`);

    const audioChunks: Buffer[] = [];
    let totalSize = 0;
    const outputFormat = request.output_format || ElevenLabsOutputFormat.MP3_44100_128;

    for (let i = 0; i < chunks.length; i++) {
      const chunkRequest = { ...request, text: chunks[i] };

      // Add context for better continuity
      if (i > 0) {
        chunkRequest.previous_text = chunks[i - 1].slice(-100); // Last 100 chars of previous chunk
      }
      if (i < chunks.length - 1) {
        chunkRequest.next_text = chunks[i + 1].slice(0, 100); // First 100 chars of next chunk
      }

      this.logger.log(`Synthesizing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);

      try {
        // Call the core synthesis method directly to avoid recursion
        const requestBody = {
          text: chunks[i],
          model_id: chunkRequest.model_id || ElevenLabsModel.ELEVEN_FLASH_V2,
          voice_settings: chunkRequest.voice_settings || this.getDefaultVoiceSettings(chunkRequest.voice_id),
          output_format: outputFormat,
          optimize_streaming_latency: chunkRequest.optimize_streaming_latency || 0,
          enable_logging: chunkRequest.enable_logging !== false,
          apply_text_normalization: chunkRequest.apply_text_normalization || 'auto',
          previous_text: chunkRequest.previous_text,
          next_text: chunkRequest.next_text,
        };

        const chunkResult = await this.synthesizeWithRetry(requestBody, chunkRequest.voice_id, storageKey, outputFormat);
        audioChunks.push(chunkResult.audio);
        totalSize += chunkResult.audioSize || chunkResult.audio.length;
      } catch (error) {
        this.logger.error(`Failed to synthesize chunk ${i + 1}: ${error.message}`);
        throw new Error(`Failed to synthesize chunk ${i + 1}: ${error.message}`);
      }
    }

    // Concatenate all audio chunks
    const concatenatedAudio = Buffer.concat(audioChunks);

    // Upload the concatenated result
    const fileName = `elevenlabs-long-${nanoid()}.${this.getFileExtension(outputFormat)}`;
    const fullStorageKey = `${storageKey}${fileName}`;

    const uploadResult = await this.s3Service.uploadFile({
      buffer: concatenatedAudio,
      fileName,
      mimeType: 'audio/mpeg',
      userurn: 'system',
      assetType: 'audio' as any,
      uniqueKey: fullStorageKey,
      metadata: {
        contentType: 'audio/mpeg',
        audioSize: concatenatedAudio.length,
        isLongTextSynthesis: true,
        chunkCount: chunks.length,
      },
    });

    this.logger.log(`Long text synthesis completed. Concatenated ${chunks.length} chunks into ${fullStorageKey}`);

    return {
      audio: concatenatedAudio,
      contentType: 'audio/mpeg',
      storageKey: fullStorageKey,
      cdnRootUrl: uploadResult.cdnRootUrl,
      bucket: uploadResult.bucket,
      region: uploadResult.region,
      audioSize: concatenatedAudio.length,
    };
  }

  /**
   * Break text into smaller chunks at natural boundaries
   */
  private breakTextIntoChunks(text: string, maxChunkSize: number): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';

    // Split by sentences first, then by words if needed
    const sentences = text.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxChunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // If single sentence is too long, break by words
        if (sentence.length > maxChunkSize) {
          const words = sentence.split(' ');
          let wordChunk = '';

          for (const word of words) {
            if (wordChunk.length + word.length + 1 <= maxChunkSize) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk.trim());
              }
              wordChunk = word;
            }
          }

          if (wordChunk) {
            currentChunk = wordChunk;
          }
        } else {
          currentChunk = sentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Synthesize with retry logic and timeout handling
   */
  private async synthesizeWithRetry(
    requestBody: any,
    voiceId: string,
    storageKey: string,
    outputFormat: ElevenLabsOutputFormat,
    maxRetries: number = 2,
    timeoutMs?: number,
  ): Promise<ElevenLabsAudioResult> {
    // Use configurable timeout or default based on text length
    const defaultTimeout = Math.min(Math.max(requestBody.text.length * 50, 30000), 180000); // 50ms per char, min 30s, max 3min
    const actualTimeout = timeoutMs || defaultTimeout;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        this.logger.log(`ElevenLabs synthesis attempt ${attempt}/${maxRetries + 1} (timeout: ${actualTimeout}ms)`);

        // Create an AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), actualTimeout);

        try {
          // Make API call to ElevenLabs with timeout
          const response = await fetch(
            `${this.baseUrl}/text-to-speech/${voiceId}`,
            {
              method: 'POST',
              headers: {
                Accept: 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': this.apiKey,
              },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            },
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
          }

          // Process successful response
          return await this.processSuccessfulResponse(response, storageKey, outputFormat);

        } catch (fetchError) {
          clearTimeout(timeoutId);

          if (fetchError.name === 'AbortError') {
            this.logger.warn(`ElevenLabs request timed out after ${actualTimeout}ms on attempt ${attempt}`);

            // Try to check if the generation completed via history API
            if (attempt === maxRetries + 1) {
              this.logger.log('Checking ElevenLabs history for completed generation...');
              const historyResult = await this.checkRecentHistoryForText(requestBody.text, voiceId);
              if (historyResult) {
                this.logger.log('Found completed generation in history');
                return historyResult;
              }
            }

            throw new Error(`Request timed out after ${actualTimeout}ms`);
          }

          throw fetchError;
        }

      } catch (error) {
        lastError = error;

        if (attempt <= maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          this.logger.warn(`ElevenLabs synthesis attempt ${attempt} failed, retrying in ${delayMs}ms: ${error.message}`);
          await this.delay(delayMs);
        }
      }
    }

    throw lastError;
  }

  /**
   * Process successful API response
   */
  private async processSuccessfulResponse(
    response: Response,
    storageKey: string,
    outputFormat: ElevenLabsOutputFormat,
  ): Promise<ElevenLabsAudioResult> {
    // Get headers before processing stream
    const historyItemId = response.headers.get('history-item-id');
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');

    // Generate S3 key
    const fileExtension = this.getFileExtension(outputFormat);
    const fileName = `elevenlabs-${nanoid()}.${fileExtension}`;
    const fullStorageKey = `${storageKey}${fileName}`;

    // Stream the response efficiently
    if (!response.body) {
      throw new Error('No response body available for streaming');
    }

    // Use streaming approach with memory efficiency
    const audioBuffer = await this.streamToBuffer(response.body);
    const audioSize = audioBuffer.length;

    this.logger.log(`Downloaded audio stream: ${audioSize} bytes`);

    // Upload to S3
    const uploadResult = await this.s3Service.uploadFile({
      buffer: audioBuffer,
      fileName,
      mimeType: contentType,
      userurn: 'system',
      assetType: 'audio' as any,
      uniqueKey: fullStorageKey,
      metadata: {
        historyItemId,
        contentType,
        audioSize,
      },
    });

    this.logger.log(`ElevenLabs synthesis completed. Audio uploaded to S3: ${fullStorageKey}`);

    return {
      audio: audioBuffer,
      contentType,
      historyItemId,
      storageKey: fullStorageKey,
      cdnRootUrl: uploadResult.cdnRootUrl,
      bucket: uploadResult.bucket,
      region: uploadResult.region,
      audioSize,
    };
  }

  /**
   * Check recent history for a completed generation with matching text
   */
  private async checkRecentHistoryForText(
    text: string,
    voiceId: string,
    maxItems: number = 10,
  ): Promise<ElevenLabsAudioResult | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/history?page_size=${maxItems}&voice_id=${voiceId}`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        },
      );

      if (!response.ok) {
        this.logger.warn('Failed to fetch ElevenLabs history');
        return null;
      }

      const historyData = await response.json();

      // Look for a matching history item with the same text
      const matchingItem = historyData.history?.find((item: any) =>
        item.text === text &&
        item.voice_id === voiceId &&
        item.state !== 'failed' // Only consider non-failed items
      );

      if (matchingItem && matchingItem.history_item_id) {
        // Try to download the audio from the history item
        return await this.downloadFromHistory(matchingItem.history_item_id);
      }

      return null;
    } catch (error) {
      this.logger.warn('Error checking ElevenLabs history:', error.message);
      return null;
    }
  }

  /**
   * Download audio from a history item
   */
  private async downloadFromHistory(historyItemId: string): Promise<ElevenLabsAudioResult | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/history/${historyItemId}/audio`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const audioBuffer = await this.streamToBuffer(response.body);

      // Generate storage info for the downloaded audio
      const fileName = `elevenlabs-history-${historyItemId}.mp3`;
      const storageKey = `transcriptions/elevenlabs/${fileName}`;

      // Upload to S3
      const uploadResult = await this.s3Service.uploadFile({
        buffer: audioBuffer,
        fileName,
        mimeType: contentType,
        userurn: 'system',
        assetType: 'audio' as any,
        uniqueKey: storageKey,
        metadata: {
          historyItemId,
          contentType,
          audioSize: audioBuffer.length,
          recoveredFromHistory: true,
        },
      });

      this.logger.log(`Recovered audio from ElevenLabs history: ${historyItemId}`);

      return {
        audio: audioBuffer,
        contentType,
        historyItemId,
        storageKey,
        cdnRootUrl: uploadResult.cdnRootUrl,
        bucket: uploadResult.bucket,
        region: uploadResult.region,
        audioSize: audioBuffer.length,
      };
    } catch (error) {
      this.logger.warn('Error downloading from ElevenLabs history:', error.message);
      return null;
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Synthesize newscaster-style speech with optimized settings
   */
  async synthesizeNewscasterSpeech({
    textBlocks,
    voiceId,
    storageKey
  }: { textBlocks: string[], voiceId: ElevenLabsVoiceId, storageKey: string }): Promise<ElevenLabsAudioResult> {


    // Create news-formatted text with proper breaks
    const formattedText = this.formatNewsText(textBlocks);

    const request: ElevenLabsSynthesisRequest = {
      text: formattedText,
      voice_id: voiceId,
      model_id: ElevenLabsModel.ELEVEN_FLASH_V2,
      voice_settings: this.getNewscasterVoiceSettings(),
      output_format: ElevenLabsOutputFormat.MP3_44100_128,
      apply_text_normalization: 'on',
      enable_logging: true,
    };

    return this.synthesizeTextToSpeech(request, storageKey);
  }

  /**
   * Format text blocks for news/broadcast style reading
   */
  private formatNewsText(textBlocks: string[]): string {
    return textBlocks
      .map((block) => block.trim())
      .filter((block) => block.length > 0)
      .join('\n\n'); // Double line breaks for natural pauses
  }

  /**
   * Get available voices from ElevenLabs API
   */
  async getAvailableVoices(): Promise<ElevenLabsVoice[]> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs service is not properly configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      this.logger.error('Failed to fetch ElevenLabs voices:', error.message);
      throw error;
    }
  }

  /**
   * Get voice information by ID
   */
  async getVoiceById(voiceId: string): Promise<ElevenLabsVoice> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs service is not properly configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voice ${voiceId}: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch voice ${voiceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get current usage information
   */
  async getUserUsage(): Promise<ElevenLabsUsage> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs service is not properly configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch usage: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Failed to fetch ElevenLabs usage:', error.message);
      throw error;
    }
  }

  /**
   * Get file extension for output format
   */
  private getFileExtension(format: ElevenLabsOutputFormat): string {
    if (format.startsWith('mp3_')) {
      return 'mp3';
    }
    if (format.startsWith('pcm_')) {
      return 'wav';
    }
    if (format === ElevenLabsOutputFormat.ULAW_8000) {
      return 'wav';
    }
    return 'mp3'; // Default fallback
  }

  /**
   * Validate if a voice ID is valid for ElevenLabs
   */
  isValidVoiceId(voiceId: string): boolean {
    return Object.values(ElevenLabsVoiceId).includes(
      voiceId as ElevenLabsVoiceId,
    );
  }

  /**
   * Get models available for a specific voice
   */
  async getAvailableModelsForVoice(
    voiceId: ElevenLabsVoiceId,
  ): Promise<string[]> {
    try {
      const voice = await this.getVoiceById(voiceId);
      return voice.high_quality_base_model_ids || [];
    } catch (error) {
      this.logger.warn(
        `Could not fetch models for voice ${voiceId}:`,
        error.message,
      );
      // Return default models
      return [
        ElevenLabsModel.ELEVEN_MULTILINGUAL_V2,
        ElevenLabsModel.ELEVEN_TURBO_V2_5,
      ];
    }
  }

  /**
   * Create optimized settings for different content types
   */
  createVoiceSettings(
    contentType:
      | 'news'
      | 'conversation'
      | 'narration'
      | 'podcast' = 'conversation',
  ): ElevenLabsVoiceSettings {
    switch (contentType) {
      case 'news':
        return {
          stability: 0.8,
          similarity_boost: 0.85,
          style: 0.4,
          use_speaker_boost: true,
        };
      case 'narration':
        return {
          stability: 0.7,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: false,
        };
      case 'podcast':
        return {
          stability: 0.6,
          similarity_boost: 0.75,
          style: 0.1,
          use_speaker_boost: false,
        };
      case 'conversation':
      default:
        return {
          stability: 0.5,
          similarity_boost: 0.7,
          style: 0.0,
          use_speaker_boost: false,
        };
    }
  }

  /**
   * Efficiently convert a ReadableStream to Buffer with memory management
   */
  private async streamToBuffer(
    stream: ReadableStream<Uint8Array>,
  ): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    let totalSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        totalSize += value.length;

        // Log progress for large files
        if (totalSize > 0 && totalSize % (1024 * 1024) === 0) {
          this.logger.log(
            `Downloaded ${Math.round(totalSize / (1024 * 1024))}MB...`,
          );
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.logger.log(`Total audio data downloaded: ${totalSize} bytes`);
    return Buffer.concat(chunks);
  }


}
