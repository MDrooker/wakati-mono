# AWS Comprehend Content Moderation Service

This service provides comprehensive text content moderation using AWS Comprehend. It analyzes text for toxic content, sentiment, and personally identifiable information (PII).

## Features

- **Toxic Content Detection**: Identifies hate speech, harassment, insults, and other toxic content
- **Sentiment Analysis**: Determines the emotional tone of text (positive, negative, neutral, mixed)
- **PII Detection**: Finds personally identifiable information like emails, phone numbers, SSNs, etc.
- **Configurable Thresholds**: Customizable confidence thresholds for different types of analysis
- **Comprehensive Results**: Detailed analysis results with confidence scores and specific detections

## Usage

### Basic Text Moderation

```typescript
import { ComprehendService } from 'src/common/aws/aws.comprehend.service';

// Inject the service
constructor(private readonly comprehendService: ComprehendService) {}

// Moderate text with default settings
const result = await this.comprehendService.moderateTextContent('Text to analyze');

console.log(result.isApproved); // boolean
console.log(result.confidence); // 0.0 - 1.0
console.log(result.detections); // Array of detected issues
console.log(result.reason); // Human-readable explanation
```

### Advanced Configuration

```typescript
const result = await this.comprehendService.moderateTextContent(text, {
  languageCode: LanguageCode.EN,
  includeSentiment: true,
  includePiiDetection: true,
  includeToxicContent: true,
  toxicContentThreshold: 0.7,     // 0.0 - 1.0
  approvalThreshold: 0.8,         // 0.0 - 1.0
});
```

### Result Structure

```typescript
interface TextModerationResult {
  isApproved: boolean;            // Overall approval status
  confidence: number;             // Confidence in the decision (0.0 - 1.0)
  detections: string[];           // Specific issues detected
  reason?: string;                // Human-readable explanation
  categories?: string[];          // Categories of issues found
  severity?: 'low' | 'medium' | 'high'; // Severity level
  
  // Detailed analysis results
  sentiment?: {
    sentiment: SentimentType;
    confidenceScores: {
      positive: number;
      negative: number;
      neutral: number;
      mixed: number;
    };
  };
  
  toxicContent?: {
    labels: Array<{
      name: ToxicContentType;
      score: number;
    }>;
  };
  
  piiEntities?: Array<{
    type: PiiEntityType;
    score: number;
    beginOffset: number;
    endOffset: number;
  }>;
  
  analysisTimestamp: string;
}
```

## Configuration

The service requires AWS credentials to be configured:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## AWS Comprehend Features Used

### Toxic Content Detection
- Detects: `HATE_SPEECH`, `INSULT`, `GRAPHIC`, `HARASSMENT_OR_ABUSE`, `SEXUAL`, `VIOLENCE_OR_THREAT`, `PROFANITY`
- Returns confidence scores for each detection type

### Sentiment Analysis
- Sentiments: `POSITIVE`, `NEGATIVE`, `NEUTRAL`, `MIXED`
- Provides confidence scores for each sentiment type

### PII Detection
- Detects: `CREDIT_DEBIT_NUMBER`, `SSN`, `PHONE`, `EMAIL`, `ADDRESS`, `NAME`, and many more
- Returns exact location (offset) of detected PII in the text

## Error Handling

The service handles errors gracefully:
- Network failures return rejection with error details
- Invalid input is caught and reported
- Service unavailability is detected and handled

## Health Monitoring

```typescript
const health = await comprehendService.getHealthStatus();
console.log(health.status); // 'healthy' | 'unhealthy'
console.log(health.details); // Additional information
```

## Integration with Post Moderation

The service is integrated with the post content moderation workflow:

1. Post content is analyzed using all available Comprehend features
2. Results are stored in the post entity
3. Users are notified if content is rejected
4. Detailed analysis results are preserved for audit purposes

## Testing

The service includes comprehensive unit tests covering:
- Clean content approval
- Toxic content detection
- PII detection
- Sentiment analysis
- Error handling
- Health monitoring

Run tests with:
```bash
npm test aws.comprehend.service.spec.ts
```

## AWS Costs

AWS Comprehend pricing (as of 2024):
- Toxic content detection: $0.50 per 1,000 characters
- Sentiment analysis: $0.0001 per unit (100 characters)
- PII detection: $0.0005 per unit (100 characters)

Monitor usage through AWS CloudWatch and set up billing alerts as needed.
