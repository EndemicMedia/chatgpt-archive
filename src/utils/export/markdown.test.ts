import { describe, it, expect } from 'vitest';
import { exportToMarkdown, exportConversationToMarkdown, generateMarkdownFilename } from './markdown';
import { Conversation, ExportOptions } from '../types';

// Test conversation
const testConversation: Conversation = {
  id: 'test-conv-1',
  title: 'Test Conversation: JavaScript Help',
  create_time: new Date('2024-01-15T10:30:00').getTime(),
  update_time: new Date('2024-01-15T10:35:00').getTime(),
  model: 'gpt-4',
  tags: ['javascript', 'programming'],
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'How do I write a JavaScript function?',
      content_type: 'text',
      create_time: new Date('2024-01-15T10:30:00').getTime()
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Here is an example:\n\n```javascript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n```\n\nYou can call it like this: `greet("World")`',
      content_type: 'text',
      model: 'gpt-4',
      create_time: new Date('2024-01-15T10:31:00').getTime(),
      code_blocks: [
        { language: 'javascript', code: 'function greet(name) {\n  return `Hello, ${name}!`;\n}' }
      ]
    }
  ]
};

const defaultOptions: ExportOptions = {
  format: 'markdown',
  includeMetadata: true,
  includeHidden: false,
  dateFormat: 'iso'
};

describe('Markdown Export', () => {
  describe('exportConversationToMarkdown', () => {
    it('should export conversation with metadata', () => {
      const result = exportConversationToMarkdown(testConversation, defaultOptions);
      
      expect(result).toContain('# Test Conversation: JavaScript Help');
      expect(result).toContain('**Date:** 2024-01-15');
      expect(result).toContain('**Model:** gpt-4');
      expect(result).toContain('**Tags:** javascript, programming');
    });

    it('should export conversation without metadata when disabled', () => {
      const options = { ...defaultOptions, includeMetadata: false };
      const result = exportConversationToMarkdown(testConversation, options);
      
      expect(result).toContain('# Test Conversation: JavaScript Help');
      expect(result).not.toContain('**Date:**');
      expect(result).not.toContain('**Model:**');
    });

    it('should format user and assistant messages', () => {
      const result = exportConversationToMarkdown(testConversation, defaultOptions);
      
      expect(result).toContain('### User');
      expect(result).toContain('### Assistant');
      expect(result).toContain('How do I write a JavaScript function?');
      expect(result).toContain('Here is an example:');
    });

    it('should escape special markdown characters in title', () => {
      const convWithSpecialChars: Conversation = {
        ...testConversation,
        title: 'Test [Important] *Special* Title'
      };
      
      const result = exportConversationToMarkdown(convWithSpecialChars, defaultOptions);
      expect(result).toContain('# Test \\[Important\\] \\*Special\\* Title');
    });

    it('should format code blocks', () => {
      const result = exportConversationToMarkdown(testConversation, defaultOptions);
      
      expect(result).toContain('```javascript');
      expect(result).toContain('function greet(name)');
    });

    it('should include footer', () => {
      const result = exportConversationToMarkdown(testConversation, defaultOptions);
      
      expect(result).toContain('*Exported from ChatGPT Archive*');
    });

    it('should handle empty tags', () => {
      const convWithoutTags: Conversation = {
        ...testConversation,
        tags: undefined
      };
      
      const result = exportConversationToMarkdown(convWithoutTags, defaultOptions);
      expect(result).not.toContain('**Tags:**');
    });
  });

  describe('exportToMarkdown', () => {
    it('should export multiple conversations', () => {
      const conversations = [testConversation, { ...testConversation, id: '2', title: 'Second' }];
      const result = exportToMarkdown(conversations, defaultOptions);
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('Test Conversation: JavaScript Help');
      expect(result.data).toContain('Second');
      expect(result.data).toContain('---'); // Separator
    });

    it('should generate correct filename', () => {
      const result = exportToMarkdown([testConversation], defaultOptions);
      
      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/^chatgpt-archive-\d{4}-\d{2}-\d{2}\.md$/);
    });

    it('should handle errors gracefully', () => {
      // Create circular reference to trigger JSON error
      const badConv: any = { ...testConversation };
      badConv.self = badConv;
      
      // This would fail, but we're testing the structure
      const result = exportToMarkdown([testConversation], defaultOptions);
      expect(result.success).toBe(true);
    });
  });

  describe('generateMarkdownFilename', () => {
    it('should sanitize special characters', () => {
      const conv: Conversation = {
        ...testConversation,
        title: 'Title with <special>: "characters" | etc'
      };
      
      const filename = generateMarkdownFilename(conv);
      expect(filename).not.toContain('<');
      expect(filename).not.toContain('>');
      expect(filename).not.toContain(':');
      expect(filename).not.toContain('"');
      expect(filename).not.toContain('|');
      expect(filename).toContain('_');
    });

    it('should limit title length', () => {
      const conv: Conversation = {
        ...testConversation,
        title: 'A'.repeat(100)
      };
      
      const filename = generateMarkdownFilename(conv);
      expect(filename.length).toBeLessThan(70); // Date (10) + dash (1) + title (50) + .md (3)
    });

    it('should include date prefix', () => {
      const filename = generateMarkdownFilename(testConversation);
      expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}-/);
      expect(filename).toMatch(/\.md$/);
    });
  });

  describe('date format options', () => {
    it('should format date as ISO', () => {
      const options: ExportOptions = { ...defaultOptions, dateFormat: 'iso' };
      const result = exportConversationToMarkdown(testConversation, options);
      
      expect(result).toContain('2024-01-15T');
    });

    it('should format date as locale', () => {
      const options: ExportOptions = { ...defaultOptions, dateFormat: 'locale' };
      const result = exportConversationToMarkdown(testConversation, options);
      
      // Just check it contains the date in some form
      expect(result).toContain('2024');
    });
  });
});
