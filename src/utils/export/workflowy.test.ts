import { describe, it, expect } from 'vitest';
import { exportToWorkflowy, exportConversationToWorkflowy, generateOPMLFilename } from './workflowy';
import { Conversation, ExportOptions } from '../types';

const testConversation: Conversation = {
  id: 'test-conv-1',
  title: 'Workflowy Test',
  create_time: new Date('2024-01-15T10:30:00').getTime(),
  update_time: new Date('2024-01-15T10:35:00').getTime(),
  model: 'gpt-4',
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'How does Workflowy work?',
      content_type: 'text',
      create_time: new Date('2024-01-15T10:30:00').getTime()
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Workflowy is an infinite list.\n\nYou can:\n- Nest items\n- Collapse sections\n- Tag with #hashtags',
      content_type: 'text',
      model: 'gpt-4',
      create_time: new Date('2024-01-15T10:31:00').getTime()
    }
  ]
};

const defaultOptions: ExportOptions = {
  format: 'workflowy',
  includeMetadata: true,
  includeHidden: false,
  dateFormat: 'iso'
};

describe('Workflowy Export', () => {
  describe('exportToWorkflowy', () => {
    it('should generate valid OPML structure', () => {
      const result = exportToWorkflowy([testConversation], defaultOptions);
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.data).toContain('<opml version="2.0">');
      expect(result.data).toContain('</opml>');
    });

    it('should include head section', () => {
      const result = exportToWorkflowy([testConversation], defaultOptions);
      
      expect(result.data).toContain('<head>');
      expect(result.data).toContain('<title>ChatGPT Archive Export</title>');
      expect(result.data).toContain('<dateCreated>');
      expect(result.data).toContain('</head>');
    });

    it('should include body section', () => {
      const result = exportToWorkflowy([testConversation], defaultOptions);
      
      expect(result.data).toContain('<body>');
      expect(result.data).toContain('</body>');
    });

    it('should wrap conversations in root outline', () => {
      const result = exportToWorkflowy([testConversation], defaultOptions);
      
      expect(result.data).toContain('<outline text="ChatGPT Archive (1 conversations)">');
    });

    it('should include conversation title as outline', () => {
      const result = exportToWorkflowy([testConversation], defaultOptions);
      
      expect(result.data).toContain('<outline text="Workflowy Test">');
    });

    it('should format messages with Q/A labels', () => {
      const result = exportToWorkflowy([testConversation], defaultOptions);
      
      expect(result.data).toContain('text="Q1: User"');
      expect(result.data).toContain('text="A1: Assistant"');
    });

    it('should include message content in _note attribute', () => {
      const result = exportToWorkflowy([testConversation], defaultOptions);
      
      expect(result.data).toContain('_note="How does Workflowy work?"');
      expect(result.data).toContain('_note="Workflowy is an infinite list.');
    });

    it('should include metadata outlines', () => {
      const result = exportToWorkflowy([testConversation], defaultOptions);
      
      expect(result.data).toContain('<outline text="📅');
      expect(result.data).toContain('<outline text="🤖 gpt-4"');
    });

    it('should handle multiple conversations', () => {
      const conversations = [
        testConversation,
        { ...testConversation, id: '2', title: 'Second' }
      ];
      
      const result = exportToWorkflowy(conversations, defaultOptions);
      
      expect(result.data).toContain('(2 conversations)');
      expect(result.data).toContain('text="Workflowy Test"');
      expect(result.data).toContain('text="Second"');
    });

    it('should escape XML special characters', () => {
      const conv: Conversation = {
        ...testConversation,
        title: 'Test & Example <Special>'
      };
      
      const result = exportToWorkflowy([conv], defaultOptions);
      expect(result.data).toContain('text="Test &amp; Example &lt;Special&gt;"');
    });

    it('should escape newlines in _note', () => {
      const result = exportToWorkflowy([testConversation], defaultOptions);
      
      // Newlines should be encoded as &#10;
      expect(result.data).toContain('&#10;');
    });

    it('should generate correct filename', () => {
      const result = exportToWorkflowy([testConversation], defaultOptions);
      
      expect(result.filename).toMatch(/^chatgpt-archive-\d{4}-\d{2}-\d{2}\.opml$/);
    });
  });

  describe('exportConversationToWorkflowy', () => {
    it('should export single conversation', () => {
      const result = exportConversationToWorkflowy(testConversation);
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('<opml');
      expect(result.data).toContain('Workflowy Test');
    });
  });

  describe('generateOPMLFilename', () => {
    it('should include date prefix', () => {
      const filename = generateOPMLFilename();
      expect(filename).toMatch(/^chatgpt-archive-\d{4}-\d{2}-\d{2}\.opml$/);
    });

    it('should include conversation title when provided', () => {
      const filename = generateOPMLFilename(testConversation);
      expect(filename).toContain('Workflowy Test');
    });

    it('should truncate long titles', () => {
      const conv: Conversation = {
        ...testConversation,
        title: 'A'.repeat(50)
      };
      
      const filename = generateOPMLFilename(conv);
      expect(filename.length).toBeLessThan(60);
    });
  });
});
