import { describe, it, expect } from 'vitest';
import { exportToObsidian, exportConversationToObsidian, generateObsidianFilename } from './obsidian';
import { Conversation, ExportOptions } from '../types';

const testConversation: Conversation = {
  id: 'test-conv-1',
  title: 'Obsidian Export Test',
  create_time: new Date('2024-01-15T10:30:00').getTime(),
  update_time: new Date('2024-01-15T10:35:00').getTime(),
  model: 'gpt-4',
  tags: ['obsidian', 'test'],
  category_id: 'cat-blue',
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'How do I use Obsidian?',
      content_type: 'text',
      create_time: new Date('2024-01-15T10:30:00').getTime()
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Obsidian is a powerful knowledge base.',
      content_type: 'text',
      model: 'gpt-4',
      create_time: new Date('2024-01-15T10:31:00').getTime()
    }
  ]
};

const defaultOptions: ExportOptions = {
  format: 'obsidian',
  includeMetadata: true,
  includeHidden: false,
  dateFormat: 'iso'
};

describe('Obsidian Export', () => {
  describe('exportConversationToObsidian', () => {
    it('should include YAML frontmatter', () => {
      const result = exportConversationToObsidian(testConversation);
      
      expect(result).toContain('---');
      expect(result).toContain('title: Obsidian Export Test');
      expect(result).toContain('tags:');
      expect(result).toContain('  - chatgpt');
      expect(result).toContain('  - ai-conversation');
      expect(result).toContain('  - obsidian');
      expect(result).toContain('  - test');
    });

    it('should include aliases', () => {
      const result = exportConversationToObsidian(testConversation);
      
      expect(result).toContain('aliases:');
      expect(result).toContain('  - "ChatGPT - 2024-01-15"');
    });

    it('should include model info', () => {
      const result = exportConversationToObsidian(testConversation);
      
      expect(result).toContain('model: gpt-4');
    });

    it('should include category', () => {
      const result = exportConversationToObsidian(testConversation);
      
      expect(result).toContain('category: cat-blue');
    });

    it('should use H1 for title', () => {
      const result = exportConversationToObsidian(testConversation);
      
      expect(result).toContain('# Obsidian Export Test');
    });

    it('should use H2 for roles', () => {
      const result = exportConversationToObsidian(testConversation);
      
      expect(result).toContain('## User');
      expect(result).toContain('## Assistant');
    });

    it('should include Obsidian callout for metadata', () => {
      const result = exportConversationToObsidian(testConversation);
      
      expect(result).toContain('> [!info] Metadata');
      expect(result).toContain('**Date:**');
      expect(result).toContain('**Model:** gpt-4');
    });

    it('should include tags at footer', () => {
      const result = exportConversationToObsidian(testConversation);
      
      expect(result).toContain('#chatgpt #ai-conversation');
    });

    it('should escape special YAML characters', () => {
      const conv: Conversation = {
        ...testConversation,
        title: 'Title: with "special" chars'
      };
      
      const result = exportConversationToObsidian(conv);
      // Title should be quoted and contain the escaped special chars
      expect(result).toContain('title:');
      expect(result).toContain('Title: with');
      expect(result).toContain('special');
      expect(result).toContain('chars');
    });
  });

  describe('exportToObsidian', () => {
    it('should export single conversation', () => {
      const result = exportToObsidian([testConversation], defaultOptions);
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('---');
      expect(result.data).toContain('Obsidian Export Test');
    });

    it('should generate index file for multiple conversations', () => {
      const conversations = [
        testConversation,
        { ...testConversation, id: '2', title: 'Second Conversation' }
      ];
      
      const result = exportToObsidian(conversations, defaultOptions);
      
      expect(result.success).toBe(true);
      expect(result.filename).toContain('archive-index');
      expect(result.data).toContain('# ChatGPT Archive Export');
      expect(result.data).toContain('[[2024-01-15 Obsidian Export T|Obsidian Export Test]]');
      expect(result.data).toContain('[[2024-01-15 Second Conversat|Second Conversation]]');
    });

    it('should include conversation count in index', () => {
      const conversations = [testConversation, { ...testConversation, id: '2' }];
      const result = exportToObsidian(conversations, defaultOptions);
      
      expect(result.data).toContain('Exported 2 conversations');
    });
  });

  describe('generateObsidianFilename', () => {
    it('should include date prefix', () => {
      const filename = generateObsidianFilename(testConversation);
      expect(filename).toMatch(/^\d{4}-\d{2}-\d{2} /);
    });

    it('should include extension by default', () => {
      const filename = generateObsidianFilename(testConversation);
      expect(filename).toMatch(/\.md$/);
    });

    it('should exclude extension when requested', () => {
      const filename = generateObsidianFilename(testConversation, false);
      expect(filename).not.toContain('.md');
    });

    it('should sanitize special characters', () => {
      const conv: Conversation = {
        ...testConversation,
        title: 'Title <with> special chars'
      };
      
      const filename = generateObsidianFilename(conv);
      expect(filename).not.toContain('<');
      expect(filename).not.toContain('>');
    });
  });
});
