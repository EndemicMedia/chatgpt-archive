/**
 * Markdown Export Module
 * 
 * Exports conversations to standard Markdown format
 */

import { Conversation, ExportOptions, ExportResult } from '@/utils/types';

/**
 * Escape special Markdown characters
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Format a message to Markdown
 */
function formatMessage(message: Conversation['messages'][0], options: ExportOptions): string {
  const role = message.role === 'user' ? 'User' : 'Assistant';
  const lines: string[] = [];
  
  lines.push(`### ${role}`);
  lines.push('');
  
  // Handle content with code blocks
  let content = message.content;
  
  // Simple code block formatting
  if (message.code_blocks && message.code_blocks.length > 0) {
    for (const block of message.code_blocks) {
      const codeFence = `\`\`\`${block.language || ''}\n${block.code}\n\`\`\``;
      // Note: This is simplified - real implementation would need position matching
      content = content.replace(block.code, codeFence);
    }
  }
  
  // Add content lines
  const contentLines = content.split('\n').map(line => {
    // Don't escape inside code fences
    if (line.startsWith('```') || line.startsWith('    ')) return line;
    return escapeMarkdown(line);
  });
  
  lines.push(...contentLines);
  
  return lines.join('\n');
}

/**
 * Format date according to options
 */
function formatDate(timestamp: number, format: ExportOptions['dateFormat']): string {
  const date = new Date(timestamp);
  
  switch (format) {
    case 'iso':
      return date.toISOString();
    case 'locale':
      return date.toLocaleString();
    case 'relative':
      const now = Date.now();
      const diff = now - timestamp;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;
      if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
      return date.toLocaleDateString();
    default:
      return date.toISOString();
  }
}

/**
 * Export a single conversation to Markdown
 */
export function exportConversationToMarkdown(
  conversation: Conversation, 
  options: ExportOptions
): string {
  const lines: string[] = [];
  
  // Title
  lines.push(`# ${escapeMarkdown(conversation.title)}`);
  lines.push('');
  
  // Metadata
  if (options.includeMetadata) {
    lines.push(`**Date:** ${formatDate(conversation.create_time, options.dateFormat)}`);
    if (conversation.model) {
      lines.push(`**Model:** ${conversation.model}`);
    }
    if (conversation.tags && conversation.tags.length > 0) {
      lines.push(`**Tags:** ${conversation.tags.join(', ')}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  
  // Messages
  for (const message of conversation.messages) {
    lines.push(formatMessage(message, options));
    lines.push('');
  }
  
  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Exported from ChatGPT Archive*');
  
  return lines.join('\n');
}

/**
 * Export multiple conversations to Markdown
 */
export function exportToMarkdown(
  conversations: Conversation[], 
  options: ExportOptions
): ExportResult {
  try {
    const sections: string[] = [];
    
    for (const conversation of conversations) {
      sections.push(exportConversationToMarkdown(conversation, options));
      sections.push('\n\n---\n\n'); // Separator between conversations
    }
    
    return {
      success: true,
      data: sections.join(''),
      filename: `chatgpt-archive-${new Date().toISOString().split('T')[0]}.md`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
}

/**
 * Generate filename for conversation
 */
export function generateMarkdownFilename(conversation: Conversation): string {
  // Sanitize title for filename
  const sanitized = conversation.title
    .replace(/[<>:"/\\|?*]/g, '_')
    .slice(0, 50);
  
  const date = new Date(conversation.create_time).toISOString().split('T')[0];
  return `${date}-${sanitized}.md`;
}
