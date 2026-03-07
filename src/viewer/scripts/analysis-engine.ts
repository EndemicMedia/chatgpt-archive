/**
 * ChatGPT Archive Analysis Engine
 * 
 * Ported from chatgpt-parser.js to browser-compatible TypeScript
 * Provides powerful analysis, search, and forensic capabilities
 */

import { Conversation, ConversationMessage } from '@/utils/types';

// Stop words and noise filtering (from original)
const NOISE = new Set(['node_id','title','value','option','button','false','true','https','selected','content','menuitem','label','aria','role','class','style','div','span','href','target','null','undefined','object','data']);
const STOP = new Set(['what','with','from','your','that','this','about','how','to','the','and','for','in','of','on','a','an','is','my','it','you','me','we','be','at','or','as','if','have','was','were','do','can','not','by','all','this','has','but','so','no','yes']);

/**
 * Clean and parse message content
 */
export function cleanContent(c: unknown): string {
  if (!c) return '';
  
  if (typeof c === 'string' && c.startsWith('{')) {
    try {
      const p = JSON.parse(c);
      if (p.user_instructions) return `[SYSTEM]: ${p.user_instructions}`;
      if (p.text) return p.text;
      if (p.thoughts && Array.isArray(p.thoughts)) {
        return p.thoughts.map((t: any) => {
          const parts = [];
          if (t.summary) parts.push(t.summary);
          if (t.text) parts.push(t.text);
          return parts.join(' ');
        }).join(' ');
      }
      if (p.actions) return p.actions.map((a: any) => `ACTION: ${a.action} ${JSON.stringify(a.queries || a.urls || '')}`).join('\n');
      if (p.content_type === 'tether_browsing_display') return p.result || '';
    } catch(e) {}
  }
  
  return String(c).replace(/^\s*\[object Object\]\n?/, '').trim();
}

/**
 * Analysis Results Types
 */
export interface SearchResult {
  conversationIndex: number;
  turnIndex: number;
  title: string;
  role: string;
  snippet: string;
  timestamp?: number;
}

export interface RankedResult {
  index: number;
  title: string;
  score: number;
  conversation: Conversation;
}

export interface TimelineEntry {
  turn: number;
  timestamp: string;
  role: string;
  preview: string;
}

export interface StatsResult {
  totalChats: number;
  dateRange: { start: string; end: string };
  totalMessages: number;
  totalWords: number;
  averageMessagesPerChat: number;
}

export interface HeatmapData {
  [period: string]: number;
}

export interface TopicCount {
  word: string;
  count: number;
}

export interface ModelUsage {
  model: string;
  count: number;
}

export interface TurnStats {
  turn: number;
  role: string;
  words: number;
  chars: number;
}

export interface PIIFinding {
  turn: number;
  type: string;
  matches: string[];
}

// ============================================================================
// NAVIGATION & VIEWING
// ============================================================================

/**
 * List conversations with pagination
 */
export function listConversations(
  conversations: Conversation[],
  limit: number = 50,
  offset: number = 0
): Array<{ index: number; date: string; title: string; messageCount: number }> {
  return conversations
    .slice(offset, offset + limit)
    .map((c, i) => ({
      index: offset + i,
      date: new Date(c.create_time).toLocaleDateString(),
      title: c.title,
      messageCount: c.messages?.length || 0
    }));
}

/**
 * Get conversation snapshot/peek
 */
export function peekConversation(conversation: Conversation): {
  title: string;
  messageCount: number;
  estimatedTokens: number;
  firstMessage: string;
  lastMessage: string;
} {
  const messages = (conversation.messages || []).filter(m => cleanContent(m.content));
  const first = cleanContent(messages[0]?.content);
  const last = cleanContent(messages[messages.length - 1]?.content);
  
  return {
    title: conversation.title,
    messageCount: messages.length,
    estimatedTokens: Math.ceil(JSON.stringify(conversation).length / 4),
    firstMessage: first.slice(0, 180) + (first.length > 180 ? '...' : ''),
    lastMessage: last.slice(0, 180) + (last.length > 180 ? '...' : '')
  };
}

/**
 * Get clean dialogue (user/assistant only)
 */
export function getDialogue(conversation: Conversation): Array<{
  turn: number;
  role: 'user' | 'assistant';
  content: string;
}> {
  return (conversation.messages || [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && cleanContent(m.content))
    .map((m, i) => ({
      turn: i,
      role: m.role as 'user' | 'assistant',
      content: cleanContent(m.content)
    }));
}

/**
 * Get table of contents (first line of each user message)
 */
export function getTableOfContents(conversation: Conversation): Array<{
  turn: number;
  preview: string;
}> {
  return (conversation.messages || [])
    .filter(m => m.role === 'user')
    .map((m, i) => ({
      turn: i,
      preview: cleanContent(m.content).split('\n')[0].slice(0, 80)
    }));
}

/**
 * Get chronological timeline
 */
export function getTimeline(conversation: Conversation): TimelineEntry[] {
  return (conversation.messages || [])
    .map((m, i) => ({
      turn: i,
      timestamp: new Date(m.create_time).toLocaleString(),
      role: m.role.toUpperCase(),
      preview: cleanContent(m.content).slice(0, 80).replace(/\n/g, ' ')
    }));
}

// ============================================================================
// SEARCH & RETRIEVAL
// ============================================================================

/**
 * Search conversations for keyword (grep)
 */
export function searchConversations(
  conversations: Conversation[],
  keyword: string
): SearchResult[] {
  const k = keyword.toLowerCase();
  const results: SearchResult[] = [];
  
  conversations.forEach((c, i) => {
    (c.messages || []).forEach((m, mi) => {
      const text = cleanContent(m.content);
      const lowerText = text.toLowerCase();
      const idx = lowerText.indexOf(k);
      
      if (idx !== -1) {
        results.push({
          conversationIndex: i,
          turnIndex: mi,
          title: c.title,
          role: m.role,
          snippet: text.slice(idx, idx + 100).replace(/\n/g, ' '),
          timestamp: m.create_time
        });
      }
    });
  });
  
  return results;
}

/**
 * Ranked search (weighted by title + content)
 */
export function rankedSearch(
  conversations: Conversation[],
  keyword: string,
  limit: number = 15
): RankedResult[] {
  const k = keyword.toLowerCase();
  
  return conversations
    .map((c, i) => {
      let score = (c.title || '').toLowerCase().includes(k) ? 10 : 0;
      (c.messages || []).forEach(m => {
        if (cleanContent(m.content).toLowerCase().includes(k)) score++;
      });
      return { index: i, title: c.title, score, conversation: c };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Regex search
 */
export function regexSearch(
  conversations: Conversation[],
  pattern: string
): SearchResult[] {
  try {
    const re = new RegExp(pattern, 'i');
    const results: SearchResult[] = [];
    
    conversations.forEach((c, i) => {
      (c.messages || []).forEach((m, mi) => {
        if (re.test(cleanContent(m.content))) {
          results.push({
            conversationIndex: i,
            turnIndex: mi,
            title: c.title,
            role: m.role,
            snippet: cleanContent(m.content).slice(0, 100),
            timestamp: m.create_time
          });
        }
      });
    });
    
    return results;
  } catch (e) {
    return [];
  }
}

/**
 * Search by role + keyword
 */
export function searchByRole(
  conversations: Conversation[],
  role: string,
  keyword: string
): SearchResult[] {
  const r = role.toLowerCase();
  const k = keyword.toLowerCase();
  const results: SearchResult[] = [];
  
  conversations.forEach((c, i) => {
    (c.messages || []).forEach((m, mi) => {
      if (m.role.toLowerCase() === r && cleanContent(m.content).toLowerCase().includes(k)) {
        results.push({
          conversationIndex: i,
          turnIndex: mi,
          title: c.title,
          role: m.role,
          snippet: cleanContent(m.content).slice(0, 100),
          timestamp: m.create_time
        });
      }
    });
  });
  
  return results;
}

/**
 * Find conversations with attachments/code
 */
export function findWithFiles(conversations: Conversation[]): Array<{
  index: number;
  title: string;
}> {
  return conversations
    .map((c, i) => ({ index: i, conversation: c }))
    .filter(({ conversation: c }) => 
      (c.messages || []).some(m => 
        m.content && (
          m.content.includes('sandbox') ||
          m.content.includes('```') ||
          m.content.includes('attachment')
        )
      )
    )
    .map(({ index, conversation: c }) => ({ index, title: c.title }));
}

/**
 * Find long conversations
 */
export function findLongConversations(
  conversations: Conversation[],
  minWords: number = 1000
): Array<{ index: number; wordCount: number; title: string }> {
  return conversations
    .map((c, i) => {
      const wordCount = (c.messages || [])
        .reduce((sum, m) => sum + cleanContent(m.content).split(/\s+/).length, 0);
      return { index: i, wordCount, title: c.title };
    })
    .filter(r => r.wordCount >= minWords)
    .sort((a, b) => b.wordCount - a.wordCount);
}

/**
 * Date range search
 */
export function searchByDateRange(
  conversations: Conversation[],
  startDate: string,
  endDate: string
): Array<{ index: number; date: string; title: string }> {
  const start = new Date(startDate).getTime() / 1000;
  const end = new Date(endDate).getTime() / 1000;
  
  return conversations
    .map((c, i) => ({ index: i, conversation: c }))
    .filter(({ conversation: c }) => c.create_time >= start && c.create_time <= end)
    .map(({ index, conversation: c }) => ({
      index,
      date: new Date(c.create_time).toLocaleDateString(),
      title: c.title
    }));
}

// ============================================================================
// ANALYTICS & FORENSICS
// ============================================================================

/**
 * Get archive statistics
 */
export function getStats(conversations: Conversation[]): StatsResult {
  const sorted = [...conversations].sort((a, b) => (a.create_time || 0) - (b.create_time || 0));
  const totalMessages = conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0);
  const totalWords = conversations.reduce((sum, c) => 
    sum + (c.messages || []).reduce((s, m) => s + cleanContent(m.content).split(/\s+/).length, 0), 0
  );
  
  return {
    totalChats: conversations.length,
    dateRange: {
      start: new Date(sorted[0]?.create_time).toLocaleDateString(),
      end: new Date(sorted[sorted.length - 1]?.create_time).toLocaleDateString()
    },
    totalMessages,
    totalWords,
    averageMessagesPerChat: Math.round(totalMessages / conversations.length)
  };
}

/**
 * Get turn-by-turn statistics
 */
export function getTurnStats(conversation: Conversation): TurnStats[] {
  return (conversation.messages || [])
    .map((m, i) => {
      const text = cleanContent(m.content);
      return {
        turn: i,
        role: m.role.toUpperCase(),
        words: text ? text.split(/\s+/).length : 0,
        chars: text.length
      };
    })
    .filter(s => s.words > 0);
}

/**
 * Monthly activity heatmap
 */
export function getMonthlyHeatmap(conversations: Conversation[]): HeatmapData {
  const data: HeatmapData = {};
  
  conversations.forEach(c => {
    const month = new Date(c.create_time).toISOString().split('T')[0].slice(0, 7);
    data[month] = (data[month] || 0) + 1;
  });
  
  return data;
}

/**
 * 24-hour activity clock
 */
export function getHourlyClock(conversations: Conversation[]): number[] {
  const hours = new Array(24).fill(0);
  
  conversations.forEach(c => {
    hours[new Date(c.create_time).getHours()]++;
  });
  
  return hours;
}

/**
 * Top topics from titles
 */
export function getTopTopics(conversations: Conversation[], limit: number = 20): TopicCount[] {
  const counts: { [word: string]: number } = {};
  
  conversations.forEach(c => {
    (c.title || '').toLowerCase().split(/\W+/).forEach(w => {
      if (w.length > 3 && !STOP.has(w) && !NOISE.has(w)) {
        counts[w] = (counts[w] || 0) + 1;
      }
    });
  });
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

/**
 * Model usage statistics
 */
export function getModelUsage(conversations: Conversation[]): ModelUsage[] {
  const counts: { [model: string]: number } = {};
  
  conversations.forEach(c => {
    (c.messages || []).forEach(m => {
      const model = m.model || 'unknown';
      counts[model] = (counts[model] || 0) + 1;
    });
  });
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([model, count]) => ({ model, count }));
}

/**
 * PII scan for emails, IPs, secrets
 */
export function scanPII(conversation: Conversation): PIIFinding[] {
  const patterns = {
    Email: /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g,
    IP: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    Phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    APIKey: /\b(?:api[_-]?key|token|secret)[\s]*[=:]\s*['"]?[a-zA-Z0-9]{16,}['"]?/gi
  };
  
  const findings: PIIFinding[] = [];
  
  (conversation.messages || []).forEach((m, i) => {
    const text = cleanContent(m.content);
    
    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = text.match(pattern);
      if (matches) {
        findings.push({
          turn: i,
          type,
          matches: [...new Set(matches)] // Deduplicate
        });
      }
    });
  });
  
  return findings;
}

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Extract code blocks
 */
export function extractCodeBlocks(conversation: Conversation): string[] {
  const blocks: string[] = [];
  
  (conversation.messages || []).forEach(m => {
    const text = cleanContent(m.content);
    const matches = text.match(/```[\s\S]*?```/g);
    if (matches) {
      blocks.push(...matches);
    }
  });
  
  return blocks;
}

/**
 * Extract URLs
 */
export function extractURLs(conversation: Conversation): string[] {
  const text = (conversation.messages || [])
    .map(m => cleanContent(m.content))
    .join(' ');
  
  const matches = text.match(/https?:\/\/[^\s)]+/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Export conversation to HTML
 */
export function exportToHTML(conversation: Conversation): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(conversation.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .message { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .role { font-weight: bold; color: #667eea; margin-bottom: 8px; }
    .user { color: #34a853; }
    .assistant { color: #4285f4; }
    pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
    code { font-family: 'Consolas', 'Monaco', monospace; font-size: 14px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(conversation.title)}</h1>
  <p style="color: #666;">${new Date(conversation.create_time).toLocaleString()}</p>
  ${(conversation.messages || []).map(m => `
    <div class="message">
      <div class="role ${m.role}">${m.role.toUpperCase()}</div>
      <div>${formatContent(cleanContent(m.content))}</div>
    </div>
  `).join('')}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatContent(text: string): string {
  // Convert code blocks
  let formatted = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  // Convert inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Convert newlines
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

/**
 * Export manifest CSV
 */
export function exportManifestCSV(conversations: Conversation[]): string {
  let csv = 'Index,Date,Title,Messages,Words\n';
  
  conversations.forEach((c, i) => {
    const date = new Date(c.create_time).toISOString().split('T')[0];
    const words = (c.messages || [])
      .reduce((s, m) => s + cleanContent(m.content).split(/\s+/).length, 0);
    csv += `${i},${date},"${(c.title || 'Untitled').replace(/"/g, '""')}",${c.messages?.length || 0},${words}\n`;
  });
  
  return csv;
}
