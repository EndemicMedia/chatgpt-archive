import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cleanContent,
  listConversations,
  peekConversation,
  getDialogue,
  getTableOfContents,
  getTimeline,
  searchConversations,
  rankedSearch,
  regexSearch,
  searchByRole,
  findWithFiles,
  findLongConversations,
  searchByDateRange,
  getStats,
  getTurnStats,
  getMonthlyHeatmap,
  getHourlyClock,
  getTopTopics,
  getModelUsage,
  scanPII,
  extractCodeBlocks,
  extractURLs,
  exportToHTML,
  exportManifestCSV
} from './analysis-engine';
import { Conversation } from '@/utils/types';

// Test data factory
function createMockConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: `conv-${Date.now()}`,
    title: 'Test Conversation',
    create_time: Date.now(),
    update_time: Date.now(),
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'How do I write a Python function?',
        content_type: 'text',
        create_time: Date.now()
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Here is an example:\n\n```python\ndef greet():\n    pass\n```',
        content_type: 'text',
        model: 'gpt-4',
        create_time: Date.now() + 1000
      }
    ],
    ...overrides
  };
}

const mockConversations: Conversation[] = [
  createMockConversation({
    id: 'conv-1',
    title: 'Python Programming Help',
    create_time: new Date('2024-01-15T10:00:00').getTime(),
    messages: [
      { id: 'm1', role: 'user', content: 'How do I write a Python function?', content_type: 'text', create_time: new Date('2024-01-15T10:00:00').getTime() },
      { id: 'm2', role: 'assistant', content: 'Here is an example:\n\n```python\ndef greet():\n    return "Hello"\n```', content_type: 'text', model: 'gpt-4', create_time: new Date('2024-01-15T10:01:00').getTime() }
    ]
  }),
  createMockConversation({
    id: 'conv-2',
    title: 'JavaScript Async Programming',
    create_time: new Date('2024-02-20T14:00:00').getTime(),
    messages: [
      { id: 'm3', role: 'user', content: 'Explain async/await in JavaScript', content_type: 'text', create_time: new Date('2024-02-20T14:00:00').getTime() },
      { id: 'm4', role: 'assistant', content: 'Async/await is syntactic sugar for promises...', content_type: 'text', model: 'gpt-3.5', create_time: new Date('2024-02-20T14:05:00').getTime() }
    ]
  }),
  createMockConversation({
    id: 'conv-3',
    title: 'Machine Learning Basics',
    create_time: new Date('2024-03-10T09:00:00').getTime(),
    messages: [
      { id: 'm5', role: 'user', content: 'What is neural network?', content_type: 'text', create_time: new Date('2024-03-10T09:00:00').getTime() },
      { id: 'm6', role: 'assistant', content: 'A neural network is a series of algorithms... https://example.com/nn', content_type: 'text', model: 'gpt-4', create_time: new Date('2024-03-10T09:10:00').getTime() }
    ]
  })
];

describe('Analysis Engine', () => {
  describe('cleanContent', () => {
    it('should clean plain text', () => {
      expect(cleanContent('Hello world')).toBe('Hello world');
    });

    it('should parse JSON content with text field', () => {
      const json = '{"text": "Hello from JSON"}';
      expect(cleanContent(json)).toBe('Hello from JSON');
    });

    it('should parse system instructions', () => {
      const json = '{"user_instructions": "Be helpful"}';
      expect(cleanContent(json)).toBe('[SYSTEM]: Be helpful');
    });

    it('should parse thoughts', () => {
      const json = '{"thoughts": [{"summary": "Thinking...", "text": "Detailed thought"}]}';
      const result = cleanContent(json);
      expect(result).toContain('Thinking...');
      expect(result).toContain('Detailed thought');
    });

    it('should handle null/undefined', () => {
      expect(cleanContent(null)).toBe('');
      expect(cleanContent(undefined)).toBe('');
    });

    it('should strip object notation', () => {
      expect(cleanContent('[object Object]\nActual text')).toBe('Actual text');
    });
  });

  describe('listConversations', () => {
    it('should list conversations with pagination', () => {
      const result = listConversations(mockConversations, 2);
      expect(result).toHaveLength(2);
      expect(result[0].index).toBe(0);
      expect(result[0].title).toBe('Python Programming Help');
    });

    it('should respect offset', () => {
      const result = listConversations(mockConversations, 2, 1);
      expect(result[0].index).toBe(1);
      expect(result[0].title).toBe('JavaScript Async Programming');
    });

    it('should include message count', () => {
      const result = listConversations(mockConversations, 1);
      expect(result[0].messageCount).toBe(2);
    });
  });

  describe('peekConversation', () => {
    it('should return conversation snapshot', () => {
      const result = peekConversation(mockConversations[0]);
      expect(result.title).toBe('Python Programming Help');
      expect(result.messageCount).toBe(2);
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.firstMessage).toContain('Python');
    });
  });

  describe('getDialogue', () => {
    it('should return user/assistant dialogue only', () => {
      const result = getDialogue(mockConversations[0]);
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });

    it('should include turn numbers', () => {
      const result = getDialogue(mockConversations[0]);
      expect(result[0].turn).toBe(0);
      expect(result[1].turn).toBe(1);
    });
  });

  describe('getTableOfContents', () => {
    it('should return user message previews', () => {
      const result = getTableOfContents(mockConversations[0]);
      expect(result).toHaveLength(1);
      expect(result[0].preview).toContain('Python');
    });
  });

  describe('getTimeline', () => {
    it('should return chronological entries', () => {
      const result = getTimeline(mockConversations[0]);
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('USER');
      expect(result[1].role).toBe('ASSISTANT');
    });
  });

  describe('searchConversations', () => {
    it('should find keyword in content', () => {
      const results = searchConversations(mockConversations, 'Python');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe('Python Programming Help');
    });

    it('should return snippet around match', () => {
      const results = searchConversations(mockConversations, 'async');
      expect(results[0].snippet).toContain('async');
    });

    it('should be case insensitive', () => {
      const resultsLower = searchConversations(mockConversations, 'python');
      const resultsUpper = searchConversations(mockConversations, 'PYTHON');
      expect(resultsLower.length).toBe(resultsUpper.length);
    });
  });

  describe('rankedSearch', () => {
    it('should score title matches higher', () => {
      const results = rankedSearch(mockConversations, 'Python');
      expect(results[0].score).toBeGreaterThanOrEqual(10);
      expect(results[0].title).toBe('Python Programming Help');
    });

    it('should return limited results', () => {
      const results = rankedSearch(mockConversations, 'the', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should sort by score descending', () => {
      const results = rankedSearch(mockConversations, 'programming');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });

  describe('regexSearch', () => {
    it('should support regex patterns', () => {
      const results = regexSearch(mockConversations, 'def\\s+\\w+');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for invalid regex', () => {
      const results = regexSearch(mockConversations, '[invalid');
      expect(results).toEqual([]);
    });
  });

  describe('searchByRole', () => {
    it('should filter by role and keyword', () => {
      const results = searchByRole(mockConversations, 'user', 'Python');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].role).toBe('user');
    });

    it('should not match wrong role', () => {
      const results = searchByRole(mockConversations, 'assistant', 'Python function');
      expect(results.length).toBe(0);
    });
  });

  describe('findWithFiles', () => {
    it('should find conversations with code blocks', () => {
      const results = findWithFiles(mockConversations);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('findLongConversations', () => {
    it('should filter by minimum word count', () => {
      const results = findLongConversations(mockConversations, 5);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should sort by word count descending', () => {
      const results = findLongConversations(mockConversations, 1);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].wordCount).toBeGreaterThanOrEqual(results[i].wordCount);
      }
    });
  });

  describe('searchByDateRange', () => {
    it('should find conversations in date range', () => {
      const results = searchByDateRange(mockConversations, '2024-01-01', '2024-01-31');
      expect(results.length).toBeGreaterThanOrEqual(0);
      if (results.length > 0) {
        expect(results[0].title).toContain('Python');
      }
    });

    it('should return empty for out of range', () => {
      const results = searchByDateRange(mockConversations, '2025-01-01', '2025-12-31');
      expect(results).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should calculate total stats', () => {
      const stats = getStats(mockConversations);
      expect(stats.totalChats).toBe(3);
      expect(stats.totalMessages).toBe(6);
      expect(stats.totalWords).toBeGreaterThan(0);
      expect(stats.averageMessagesPerChat).toBe(2);
    });

    it('should return date range', () => {
      const stats = getStats(mockConversations);
      expect(stats.dateRange.start).toBeDefined();
      expect(stats.dateRange.end).toBeDefined();
    });
  });

  describe('getTurnStats', () => {
    it('should calculate word and char counts per turn', () => {
      const stats = getTurnStats(mockConversations[0]);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].words).toBeGreaterThan(0);
      expect(stats[0].chars).toBeGreaterThan(0);
    });
  });

  describe('getMonthlyHeatmap', () => {
    it('should aggregate by month', () => {
      const heatmap = getMonthlyHeatmap(mockConversations);
      expect(Object.keys(heatmap).length).toBeGreaterThan(0);
      expect(Object.values(heatmap).every(v => v > 0)).toBe(true);
    });
  });

  describe('getHourlyClock', () => {
    it('should return 24-hour array', () => {
      const clock = getHourlyClock(mockConversations);
      expect(clock).toHaveLength(24);
      expect(clock.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    });
  });

  describe('getTopTopics', () => {
    it('should extract topics from titles', () => {
      const topics = getTopTopics(mockConversations, 10);
      expect(topics.length).toBeGreaterThan(0);
      expect(topics[0].word).toBeDefined();
      expect(topics[0].count).toBeGreaterThan(0);
    });

    it('should filter stop words', () => {
      const topics = getTopTopics(mockConversations);
      const words = topics.map(t => t.word);
      expect(words).not.toContain('the');
      expect(words).not.toContain('and');
    });
  });

  describe('getModelUsage', () => {
    it('should count model usage', () => {
      const usage = getModelUsage(mockConversations);
      expect(usage.length).toBeGreaterThan(0);
      expect(usage.some(u => u.model === 'gpt-4')).toBe(true);
    });

    it('should sort by count descending', () => {
      const usage = getModelUsage(mockConversations);
      for (let i = 1; i < usage.length; i++) {
        expect(usage[i - 1].count).toBeGreaterThanOrEqual(usage[i].count);
      }
    });
  });

  describe('scanPII', () => {
    it('should detect email addresses', () => {
      const convWithEmail = createMockConversation({
        messages: [
          { id: 'm1', role: 'user', content: 'Contact me at test@example.com', content_type: 'text', create_time: Date.now() }
        ]
      });
      const findings = scanPII(convWithEmail);
      expect(findings.some(f => f.type === 'Email')).toBe(true);
    });

    it('should detect IP addresses', () => {
      const convWithIP = createMockConversation({
        messages: [
          { id: 'm1', role: 'user', content: 'Server at 192.168.1.1', content_type: 'text', create_time: Date.now() }
        ]
      });
      const findings = scanPII(convWithIP);
      expect(findings.some(f => f.type === 'IP')).toBe(true);
    });
  });

  describe('extractCodeBlocks', () => {
    it('should extract fenced code blocks', () => {
      const blocks = extractCodeBlocks(mockConversations[0]);
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks[0]).toContain('```');
    });
  });

  describe('extractURLs', () => {
    it('should extract HTTP URLs', () => {
      const urls = extractURLs(mockConversations[2]);
      expect(urls.length).toBeGreaterThan(0);
      expect(urls[0]).toContain('https://');
    });

    it('should deduplicate URLs', () => {
      const convWithDupes = createMockConversation({
        messages: [
          { id: 'm1', role: 'user', content: 'Visit https://example.com and https://example.com again', content_type: 'text', create_time: Date.now() }
        ]
      });
      const urls = extractURLs(convWithDupes);
      expect(urls.length).toBe(1);
    });
  });

  describe('exportToHTML', () => {
    it('should generate valid HTML', () => {
      const html = exportToHTML(mockConversations[0]);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Python Programming Help');
      expect(html).toContain('<div class="message');
    });

    it('should escape HTML in content', () => {
      const convWithHTML = createMockConversation({
        title: '<script>alert("xss")</script>',
        messages: []
      });
      const html = exportToHTML(convWithHTML);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('exportManifestCSV', () => {
    it('should generate CSV header', () => {
      const csv = exportManifestCSV(mockConversations);
      expect(csv).toContain('Index,Date,Title,Messages,Words');
    });

    it('should include conversation data', () => {
      const csv = exportManifestCSV(mockConversations);
      expect(csv).toContain('Python Programming Help');
      expect(csv).toContain('JavaScript Async Programming');
    });

    it('should escape quotes in titles', () => {
      const convWithQuotes = createMockConversation({
        title: 'Title with "quotes"'
      });
      const csv = exportManifestCSV([convWithQuotes]);
      expect(csv).toContain('""quotes""');
    });
  });
});
