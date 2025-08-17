# Editor.js Integration for JSON Post Type

This document describes how to use the new JSON post type with Editor.js for rich content creation.

## Overview

The `Post` entity now supports a `JSON` post type that stores structured content from Editor.js in the `bodyJson` field. This allows for rich, structured content while maintaining backward compatibility with text-based posts.

## Post Entity Changes

### New PostType Enum Value
```typescript
export enum PostType {
    TEXT = 'text',
    LINK = 'link',
    IMAGE = 'image',
    VIDEO = 'video',
    POLL = 'poll',
    JSON = 'json', // New: Editor.js structured content
}
```

### New Field
- `bodyJson`: JSONB field that stores Editor.js output structure

## API Usage

### Creating a JSON Post

#### REST API
```typescript
POST /posts
{
  "title": "My Rich Content Post",
  "postType": "json",
  "bodyJson": {
    "time": 1672531200000,
    "blocks": [
      {
        "id": "abc123",
        "type": "paragraph",
        "data": {
          "text": "Hello world! This is a paragraph created with Editor.js"
        }
      },
      {
        "id": "def456",
        "type": "header",
        "data": {
          "text": "This is a header",
          "level": 2
        }
      }
    ],
    "version": "2.28.2"
  }
}
```

#### GraphQL Mutation
```graphql
mutation CreateJsonPost($input: CreatePostInput!) {
  createPost(createPostInput: $input) {
    id
    posturn
    title
    bodyJson
    postType
    createdAt
  }
}
```

Variables:
```json
{
  "input": {
    "title": "My Rich Content Post",
    "postType": "JSON",
    "bodyJson": {
      "time": 1672531200000,
      "blocks": [
        {
          "id": "abc123",
          "type": "paragraph",
          "data": {
            "text": "Hello world!"
          }
        }
      ],
      "version": "2.28.2"
    },
    "userurn": "nesting:rockwell.user:12345"
  }
}
```

## Supported Editor.js Block Types

The plain text extraction supports the following Editor.js block types:

- **paragraph**: Standard text paragraphs
- **header**: Headers (h1-h6)
- **list**: Ordered and unordered lists
- **quote**: Blockquotes
- **code**: Code blocks
- **raw**: Raw HTML content
- **table**: Table data
- **checklist**: Checkbox lists

## Text Extraction for Search

When a post with `postType: JSON` is saved, the system automatically extracts plain text from the Editor.js structure and stores it in the `bodyPlainText` field. This enables:

- Full-text search functionality
- Content moderation
- Preview generation

### Example Text Extraction

Input Editor.js JSON:
```json
{
  "blocks": [
    {
      "type": "header",
      "data": { "text": "Welcome to Editor.js", "level": 2 }
    },
    {
      "type": "paragraph",
      "data": { "text": "This is a rich text editor." }
    },
    {
      "type": "list",
      "data": {
        "style": "unordered",
        "items": ["Feature 1", "Feature 2", "Feature 3"]
      }
    }
  ]
}
```

Extracted plain text:
```
Welcome to Editor.js This is a rich text editor. Feature 1 Feature 2 Feature 3
```

## Frontend Integration

### Example with Editor.js

```typescript
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';

// Initialize Editor.js
const editor = new EditorJS({
  holder: 'editorjs',
  tools: {
    header: Header,
    list: List,
    paragraph: Paragraph
  },
  placeholder: 'Let\'s write an awesome story!'
});

// Save and submit to API
async function savePost() {
  try {
    const outputData = await editor.save();
    
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'My Editor.js Post',
        postType: 'json',
        bodyJson: outputData,
        userurn: 'current-user-urn'
      })
    });
    
    const post = await response.json();
    console.log('Post created:', post);
  } catch (error) {
    console.error('Error saving post:', error);
  }
}
```

### Rendering Editor.js Content

```typescript
// To render saved Editor.js content
import EditorJS from '@editorjs/editorjs';

function renderPost(post) {
  if (post.postType === 'json' && post.bodyJson) {
    const editor = new EditorJS({
      holder: 'post-content',
      data: post.bodyJson,
      readOnly: true
    });
  } else {
    // Render traditional text content
    document.getElementById('post-content').innerHTML = post.body;
  }
}
```

## Migration Notes

- Existing posts with `postType` other than `JSON` remain unchanged
- The `body` field is still used for non-JSON post types
- Both `body` and `bodyJson` can coexist, but typically only one should be used per post
- The system automatically handles plain text extraction for search indexing

## Validation

- `bodyJson` is optional and only relevant for JSON post type
- When `postType` is `JSON`, `bodyJson` should contain valid Editor.js output structure
- The system validates the JSON structure but doesn't enforce specific Editor.js schema validation
