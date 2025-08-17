import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './aws.s3.service';
import { nanoid } from 'nanoid';
import {
  TranscribeLanguage,
  PollyVoiceId,
  PollySpeakingStyle,
  PollyEngine,
  AudioResult,
  PollyTranscriptionRequest,
} from './aws.polly.types';

@Injectable()
export class PollyService {
  private readonly logger = new Logger(PollyService.name);
  private pollyClient: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {
    this.initializeClient();
  }

  /**
   * Initialize Polly client with dynamic import
   */
  private async initializeClient() {
    try {
      // Try to dynamically import AWS SDK
      const awsModule = await import('@aws-sdk/client-polly').catch(() => null);

      if (awsModule) {
        this.pollyClient = new awsModule.PollyClient({
          region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
          // credentials: {
          //     accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
          //     secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
          // },
        });
        this.logger.log('Polly client initialized successfully');
      } else {
        this.logger.warn(
          'AWS SDK for Polly not available. Install @aws-sdk/client-polly for Polly support',
        );
      }
    } catch (error) {
      this.logger.warn('Polly client initialization failed:', error.message);
    }
  }

  /**
   * Check if Polly is available
   */
  isAvailable(): boolean {
    return !!this.pollyClient;
  }

  /**
   * Synthesize speech from text using Amazon Polly and upload to S3
   */
  async synthesizeTextToSpeech(
    request: PollyTranscriptionRequest,
    s3KeyPrefix: string = 'transcriptions/',
  ): Promise<AudioResult> {
    if (!this.isAvailable()) {
      throw new Error(
        'Polly service is not properly configured or AWS SDK not available',
      );
    }

    try {
      this.logger.log(
        `Synthesizing speech for text length: ${request.text.length}`,
      );

      const awsModule = await import('@aws-sdk/client-polly');

      // Prepare the synthesis parameters
      const synthesizeParams: any = {
        Text: request.text,
        VoiceId: request.voiceId,
        OutputFormat: request.outputFormat || 'mp3',
        TextType: request.textType || 'text',
        Engine: request.engine || PollyEngine.NEURAL,
        LanguageCode: this.mapTranscribeLanguageToPolly(request.language),
      };

      // Add speaking style if provided and supported
      if (
        request.speakingStyle &&
        this.isSpeakingStyleSupported(request.voiceId, request.speakingStyle)
      ) {
        synthesizeParams.SpeakingStyle = request.speakingStyle;
        this.logger.log(`Using speaking style: ${request.speakingStyle}`);
      }

      // Call Polly to synthesize speech
      const command = new awsModule.SynthesizeSpeechCommand(synthesizeParams);
      const response = await this.pollyClient.send(command);

      if (!response.AudioStream) {
        throw new Error('No audio stream returned from Polly');
      }

      // Convert audio stream to buffer
      const audioBuffer = await this.streamToBuffer(response.AudioStream);

      // Generate S3 key for the audio file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const stylePrefix = request.speakingStyle
        ? `-${request.speakingStyle}`
        : '';
      const s3Key = `${s3KeyPrefix}polly-${request.voiceId}${stylePrefix}-${timestamp}.mp3`;

      // Upload to S3 using the correct method signature
      const uploadResult = await this.s3Service.uploadFile({
        buffer: audioBuffer,
        fileName: `polly-${request.voiceId}${stylePrefix}-${timestamp}.mp3`,
        mimeType: 'audio/mpeg',
        userurn: 'system', // System-generated files
        assetType: 'image', // Use 'image' since S3Service only accepts 'image' or 'video'
        uniqueKey: s3Key,
        metadata: {
          voiceId: request.voiceId,
        },
      });

      // Calculate approximate duration (very rough estimate)
      // Average speaking rate is about 150-160 words per minute
      const wordCount = request.text.split(/\s+/).length;
      const estimatedDuration = Math.round((wordCount / 150) * 60);

      const result: AudioResult = {
        storageKey: uploadResult.key || s3Key,
        bucket: uploadResult.bucket,
        region: uploadResult.region,
        cdnRootUrl: uploadResult.cdnRootUrl,
        duration: estimatedDuration,
        metadata: {
          voiceId: request.voiceId,
          service: 'polly',
          language: request.language,
          outputFormat: synthesizeParams.OutputFormat,
          textLength: request.text.length,
          requestId: response.$metadata?.requestId,
          model: request.engine || PollyEngine.NEURAL,
          speakingStyle: request.speakingStyle,
          engine: request.engine,
        },
      };

      this.logger.log(
        `Successfully synthesized speech and uploaded to S3: ${s3Key}`,
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to synthesize speech:', error);
      throw new Error(`Polly synthesis failed: ${error.message}`);
    }
  }

  /**
   * Synthesize speech from multiple text blocks (with pauses between)
   */
  async synthesizeTextBlocks(
    textBlocks: string[],
    voiceId: string,
    language: string,
    pauseDuration: number = 1000, // milliseconds
    speakingStyle?: PollySpeakingStyle,
  ): Promise<AudioResult> {
    if (!this.isAvailable()) {
      throw new Error(
        'Polly service is not properly configured or AWS SDK not available',
      );
    }

    try {
      // Combine text blocks with SSML pauses
      const ssmlText = this.createSSMLFromTextBlocks(textBlocks, pauseDuration);

      return await this.synthesizeTextToSpeech({
        text: ssmlText,
        textType: 'ssml',
        voiceId,
        language,
        outputFormat: 'mp3',
        engine: PollyEngine.NEURAL,
        speakingStyle,
      });
    } catch (error) {
      this.logger.error('Failed to synthesize text blocks:', error);
      throw error;
    }
  }

  /**
   * Synthesize speech from multiple text blocks WITHOUT SSML (plain text joins)
   * Pass useSSML=false to force plain text even if a future auto-detect is added.
   */
  async synthesizePlainTextBlocks(
    textBlocks: string[],
    voiceId: string,
    language: string,
    pauseDuration: number = 1000,
    speakingStyle?: PollySpeakingStyle,
  ): Promise<AudioResult> {
    if (!this.isAvailable()) {
      throw new Error(
        'Polly service is not properly configured or AWS SDK not available',
      );
    }

    const combined = this.createPlainTextFromTextBlocks(
      textBlocks,
      pauseDuration,
    );

    return this.synthesizeTextToSpeech({
      text: combined,
      textType: 'text',
      voiceId,
      language,
      outputFormat: 'mp3',
      engine: PollyEngine.STANDARD,
      speakingStyle,
    });
  }

  /**
   * Get available voices for a specific language
   */
  async getAvailableVoices(languageCode?: string): Promise<any[]> {
    if (!this.isAvailable()) {
      this.logger.warn('Polly service is not available for getAvailableVoices');
      return [];
    }

    try {
      const awsModule = await import('@aws-sdk/client-polly');

      const commandInput: any = {
        Engine: 'neural',
      };

      // Only add LanguageCode if provided
      if (languageCode) {
        commandInput.LanguageCode = languageCode;
      }

      const command = new awsModule.DescribeVoicesCommand(commandInput);
      const response = await this.pollyClient.send(command);
      return response.Voices || [];
    } catch (error) {
      this.logger.error('Failed to get available voices:', error);
      throw error;
    }
  }

  /**
   * Check if a speaking style is supported for a given voice
   */
  private isSpeakingStyleSupported(
    voiceId: string,
    speakingStyle: PollySpeakingStyle,
  ): boolean {
    // Define which voices support which speaking styles
    const voiceSupportMap: Record<string, PollySpeakingStyle[]> = {
      // US English voices that support newscaster
      Joanna: [
        PollySpeakingStyle.NEWSCASTER,
        PollySpeakingStyle.CONVERSATIONAL,
      ],
      Matthew: [
        PollySpeakingStyle.NEWSCASTER,
        PollySpeakingStyle.CONVERSATIONAL,
      ],
      Ivy: [PollySpeakingStyle.CONVERSATIONAL],
      Justin: [PollySpeakingStyle.CONVERSATIONAL],
      Kendra: [PollySpeakingStyle.CONVERSATIONAL],
      Kimberly: [PollySpeakingStyle.CONVERSATIONAL],
      Salli: [PollySpeakingStyle.CONVERSATIONAL],
      Joey: [PollySpeakingStyle.CONVERSATIONAL],
      // UK English voices
      Amy: [PollySpeakingStyle.CONVERSATIONAL],
      Brian: [PollySpeakingStyle.CONVERSATIONAL],
      Emma: [PollySpeakingStyle.CONVERSATIONAL],
    };

    const supportedStyles = voiceSupportMap[voiceId] || [];
    return supportedStyles.includes(speakingStyle);
  }

  /**
   * Create a newscaster-style speech synthesis
   */
  async synthesizeNewscasterSpeech(
    text: string,
    voiceId: PollyVoiceId = PollyVoiceId.JOANNA,
    language: TranscribeLanguage = TranscribeLanguage.EN_US,
  ): Promise<AudioResult> {
    return await this.synthesizeTextToSpeech({
      text,
      voiceId,
      language,
      outputFormat: 'mp3',
      engine: PollyEngine.NEURAL,
      speakingStyle: PollySpeakingStyle.NEWSCASTER,
    });
  }

  /**
   * Get voices that support newscaster style
   */
  getNewscasterCompatibleVoices(): PollyVoiceId[] {
    return [PollyVoiceId.JOANNA, PollyVoiceId.MATTHEW];
  }

  /**
   * Validate if a voice ID is compatible with a language
   */
  async validateVoiceForLanguage(
    voiceId: PollyVoiceId,
    language: TranscribeLanguage,
  ): Promise<boolean> {
    try {
      const pollyLanguageCode = this.mapTranscribeLanguageToPolly(language);
      const voices = await this.getAvailableVoices(pollyLanguageCode);

      return voices.some((voice) => voice.Id === voiceId);
    } catch (error) {
      this.logger.warn(
        `Could not validate voice ${voiceId} for language ${language}:`,
        error,
      );
      return true; // Default to true if validation fails
    }
  }

  /**
   * Create SSML markup from text blocks with pauses
   */
  private createSSMLFromTextBlocks(
    textBlocks: string[],
    pauseDuration: number,
  ): string {
    const pauseSeconds = pauseDuration / 1000;
    const ssmlParts = textBlocks.map(
      (block) =>
        `<p>${this.escapeSSML(block)}</p><break time="${pauseSeconds}s"/>`,
    );

    return `<speak>${ssmlParts.join('')}</speak>`;
  }

  /**
   * Create plain text from text blocks (no SSML) with approximate pauses using blank lines.
   * This is useful when you want to avoid SSML and rely on Polly's natural pausing for newlines.
   * Kept separate to prevent changing existing SSML workflows.
   */
  private createPlainTextFromTextBlocks(
    textBlocks: string[],
    pauseDuration: number,
  ): string {
    if (!textBlocks || textBlocks.length === 0) return '';

    const sanitized = textBlocks
      .map((b) => (b ?? '').trim())
      .filter((b) => b.length > 0);

    if (sanitized.length === 0) return '';

    const separator = pauseDuration >= 1500 ? '\n\n\n' : '\n\n';
    return sanitized.join(separator);
  }

  /**
   * Escape special characters for SSML
   */
  private escapeSSML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Create SSML markup with newscaster speaking style
   */
  private createNewscasterSSML(text: string): string {
    const escapedText = this.escapeSSML(text);
    return `<speak><amazon:domain name="news">${escapedText}</amazon:domain></speak>`;
  }

  /**
   * Synthesize news article or announcement with newscaster style
   */
  async synthesizeNewsArticle(
    headline: string,
    content: string,
    voiceId: PollyVoiceId = PollyVoiceId.JOANNA,
    language: TranscribeLanguage = TranscribeLanguage.EN_US,
  ): Promise<AudioResult> {
    // Create structured SSML for news content
    const newsSSML = this.createNewsSSML(headline, content);

    return await this.synthesizeTextToSpeech({
      text: newsSSML,
      voiceId,
      language,
      outputFormat: 'mp3',
      engine: PollyEngine.NEURAL,
      speakingStyle: PollySpeakingStyle.NEWSCASTER,
    });
  }

  /**
   * Create structured SSML for news content
   */
  private createNewsSSML(headline: string, content: string): string {
    const escapedHeadline = this.escapeSSML(headline);
    const escapedContent = this.escapeSSML(content);

    return `<speak>
            <amazon:domain name="news">
                <p><emphasis level="strong">${escapedHeadline}</emphasis></p>
                <break time="1s"/>
                <p>${escapedContent}</p>
            </amazon:domain>
        </speak>`;
  }

  /**
   * Map Transcribe language codes to Polly language codes
   */
  private mapTranscribeLanguageToPolly(transcribeLanguage: string): string {
    const languageMap: Record<string, string> = {
      'en-US': 'en-US',
      'en-GB': 'en-GB',
      'es-ES': 'es-ES',
      'es-US': 'es-US',
      'fr-FR': 'fr-FR',
      'de-DE': 'de-DE',
      'it-IT': 'it-IT',
      'ja-JP': 'ja-JP',
      'ko-KR': 'ko-KR',
      'pt-BR': 'pt-BR',
      'zh-CN': 'cmn-CN',
    };

    return languageMap[transcribeLanguage] || 'en-US';
  }

  /**
   * Convert ReadableStream to Buffer
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
