/**
 * Example usage of the new JSON post type with Editor.js
 * This file demonstrates how to create and work with JSON posts
 */

import { PostType } from '../entities/post.entity';

// Example Editor.js output structure
export const editorJsExample = {
  time: 1672531200000,
  blocks: [
    {
      id: 'abc123',
      type: 'header',
      data: {
        text: 'Welcome to the new JSON Post Type',
        level: 2,
      },
    },
    {
      id: 'def456',
      type: 'paragraph',
      data: {
        text: 'This post was created using Editor.js, a modern block-style editor that outputs clean JSON data.',
      },
    },
    {
      id: 'ghi789',
      type: 'list',
      data: {
        style: 'unordered',
        items: [
          'Rich text editing with blocks',
          'Clean JSON output',
          'Extensible with plugins',
          'Perfect for modern content management',
        ],
      },
    },
    {
      id: 'jkl012',
      type: 'quote',
      data: {
        text: 'The future of content creation is structured, semantic, and user-friendly.',
        caption: 'Editor.js Philosophy',
      },
    },
    {
      id: 'mno345',
      type: 'paragraph',
      data: {
        text: 'Try creating your own posts with the JSON type and see how the content gets automatically processed for search and moderation!',
      },
    },
  ],
  version: '2.28.2',
};

// Example CreatePostDto for JSON post
export const createJsonPostExample = {
  title: 'My First Editor.js Post',
  postType: PostType.JSON,
  bodyJson: editorJsExample,
  tags: ['editor-js', 'json', 'rich-content'],
  isPublic: true,
  allowComments: true,
};


// What the extracted plain text would look like
export const expectedPlainText =
  'Welcome to the new JSON Post Type This post was created using Editor.js, a modern block-style editor that outputs clean JSON data. Rich text editing with blocks Clean JSON output Extensible with plugins Perfect for modern content management The future of content creation is structured, semantic, and user-friendly. Try creating your own posts with the JSON type and see how the content gets automatically processed for search and moderation!';
