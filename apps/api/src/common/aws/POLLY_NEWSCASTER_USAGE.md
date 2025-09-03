# Amazon Polly Newscaster Feature Usage Guide

This document explains how to use the enhanced Polly service with newscaster speaking style capabilities.

## New Features Added

### 1. Speaking Styles Support
- **Newscaster**: Makes the voice sound like a news anchor
- **Conversational**: More natural, conversational tone

### 2. Enhanced Request Interface
```typescript
export interface PollyTranscriptionRequest {
    text: string;
    voiceId: string;
    language: string;
    outputFormat?: string;
    engine?: PollyEngine;
    speakingStyle?: PollySpeakingStyle; // NEW
}
```

### 3. New Enums
```typescript
export enum PollySpeakingStyle {
    NEWSCASTER = 'newscaster',
    CONVERSATIONAL = 'conversational',
}

export enum PollyEngine {
    NEURAL = 'neural',
    STANDARD = 'standard',
}
```

## Usage Examples

### Basic Newscaster Speech
```typescript
const result = await pollyService.synthesizeNewscasterSpeech(
    "Breaking news: Scientists discover new species in the Amazon rainforest.",
    PollyVoiceId.JOANNA,
    TranscribeLanguage.EN_US
);
```

### Custom Request with Newscaster Style
```typescript
const result = await pollyService.synthesizeTextToSpeech({
    text: "Good evening, this is your daily news update.",
    voiceId: PollyVoiceId.MATTHEW,
    language: TranscribeLanguage.EN_US,
    outputFormat: 'mp3',
    engine: PollyEngine.NEURAL,
    speakingStyle: PollySpeakingStyle.NEWSCASTER
});
```

### News Article Synthesis
```typescript
const headline = "Economic Markets Show Strong Growth";
const content = "Stock markets reached new highs today as investors responded positively to the latest economic indicators. The Dow Jones gained 2.3% while the S&P 500 increased by 1.8%.";

const result = await pollyService.synthesizeNewsArticle(
    headline,
    content,
    PollyVoiceId.JOANNA,
    TranscribeLanguage.EN_US
);
```

### Text Blocks with Newscaster Style
```typescript
const newsSegments = [
    "Welcome to the evening news.",
    "Our top story tonight: Technology advances in renewable energy.",
    "We'll be right back after this break."
];

const result = await pollyService.synthesizeTextBlocks(
    newsSegments,
    PollyVoiceId.MATTHEW,
    TranscribeLanguage.EN_US,
    2000, // 2 second pause between segments
    PollySpeakingStyle.NEWSCASTER
);
```

## Supported Voices for Newscaster Style

Currently, only these voices support the newscaster speaking style:
- **Joanna** (US English, Female)
- **Matthew** (US English, Male)

You can check compatible voices programmatically:
```typescript
const compatibleVoices = pollyService.getNewscasterCompatibleVoices();
// Returns: [PollyVoiceId.JOANNA, PollyVoiceId.MATTHEW]
```

## Voice and Style Validation

The service automatically validates if a voice supports a specific speaking style:
```typescript
const isSupported = await pollyService.validateVoiceForLanguage(
    PollyVoiceId.JOANNA,
    TranscribeLanguage.EN_US
);
```

## SSML Features

### Automatic SSML Generation
The service can automatically generate SSML markup for news content:
- Emphasizes headlines
- Adds appropriate pauses
- Uses newscaster domain tags

### Manual SSML
You can also provide your own SSML:
```typescript
const ssmlText = `
<speak>
    <amazon:domain name="news">
        <p><emphasis level="strong">Breaking News Alert</emphasis></p>
        <break time="1s"/>
        <p>This is a developing story we're following closely.</p>
    </amazon:domain>
</speak>
`;

const result = await pollyService.synthesizeTextToSpeech({
    text: ssmlText,
    voiceId: PollyVoiceId.JOANNA,
    language: TranscribeLanguage.EN_US,
    speakingStyle: PollySpeakingStyle.NEWSCASTER
});
```

## Response Metadata

The enhanced service now includes additional metadata in responses:
```typescript
interface PollyAudioResult {
    audioUrl: string;
    s3Key: string;
    duration?: number;
    metadata: {
        voiceId: string;
        language: string;
        outputFormat: string;
        textLength: number;
        requestId?: string;
        speakingStyle?: string; // NEW
        engine?: string; // NEW
    };
}
```

## Best Practices

1. **Use appropriate voices**: Only Joanna and Matthew support newscaster style
2. **Content structure**: Break long content into logical segments
3. **SSML for complex content**: Use SSML for precise control over pronunciation and timing
4. **Error handling**: Always check if the speaking style is supported before making requests
5. **File naming**: The service automatically includes the speaking style in generated file names

## Error Handling

The service gracefully handles unsupported combinations:
- If a voice doesn't support newscaster style, it falls back to the default voice behavior
- Logs are generated to help debug voice/style compatibility issues


You can expose these features through your API endpoints:

```typescript
@Resolver()
export class PollyResolver {
    constructor(private readonly pollyService: PollyService) {}

    @Mutation(() => PollyAudioResult)
    async generateNewsBroadcast(
        @Args('headline') headline: string,
        @Args('content') content: string,
        @Args('voiceId', { defaultValue: PollyVoiceId.JOANNA }) voiceId: PollyVoiceId,
    ) {
        return await this.pollyService.synthesizeNewsArticle(
            headline,
            content,
            voiceId,
            TranscribeLanguage.EN_US
        );
    }
}
```
