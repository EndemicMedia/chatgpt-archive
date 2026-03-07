/**
 * Obsidian Export Module
 * 
 * Exports conversations to Obsidian-compatible Markdown with YAML frontmatter
 */

import { Conversation, ExportOptions, ExportResult } from '@/utils/types';

/**
 * Escape YAML special characters
 */
function escapeYAML(text: string): string {
  if (text.includes(':') || text.includes('#') || text.includes('{') || 
      text.includes('}') || text.includes('[') || text.includes(']') ||
      text.includes(',') || text.includes('&') || text.includes('*') ||
      text.includes('?') || text.includes('|') || text.includes('-') ||
      text.includes('<') || text.includes('>') || text.includes('=') ||
      text.includes('!') || text.includes('%') || text.includes('@') ||
      text.includes('`') || text.includes('"') || text.includes("'")) {
    return `"${text.replace(/"/g, '\\"')}"`;
  }
  return text;
}

/**
 * Generate YAML frontmatter for Obsidian
 */
function generateFrontmatter(conversation: Conversation): string {
  const lines: string[] = ['---'];
  
  // Title
  lines.push(`title: ${escapeYAML(conversation.title)}`);
  
  // Aliases (useful for linking)
  const date = new Date(conversation.create_time).toISOString().split('T')[0];
  lines.push(`aliases:`);
  lines.push(`  - "ChatGPT - ${date}"`);
  
  // Tags
  const tags = ['chatgpt', 'ai-conversation', ...(conversation.tags || [])];
  lines.push(`tags:`);
  for (const tag of tags) {
    lines.push(`  - ${tag}`);
  }
  
  // Dates
  lines.push(`date: ${date}`);
  lines.push(`created: ${new Date(conversation.create_time).toISOString()}`);
  lines.push(`modified: ${new Date(conversation.update_time || conversation.create_time).toISOString()}`);
  
  // Model info
  if (conversation.model) {
    lines.push(`model: ${conversation.model}`);
  }
  
  // Source
  lines.push(`source: ChatGPT`);
  lines.push(`type: conversation`);
  
  // Category
  if (conversation.category_id) {
    lines.push(`category: ${conversation.category_id}`);
  }
  
  lines.push('---');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Format a message for Obsidian
 */
function formatMessage(message: Conversation['messages'][0]): string {
  const role = message.role === 'user' ? 'User' : 'Assistant';
  const lines: string[] = [];
  
  // Use H2 for roles (H1 is reserved for title)
  lines.push(`## ${role}`);
  lines.push('');
  
  // Handle code blocks with Obsidian syntax highlighting
  let content = message.content;
  
  if (message.code_blocks && message.code_blocks.length > 0) {
    for (const block of message.code_blocks) {
      const codeFence = `\`\`\`${block.language || ''}\n${block.code}\n\`\`\``;
      content = content.replace(block.code, codeFence);
    }
  }
  
  // Add content with proper escaping
  lines.push(content);
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Export a single conversation to Obsidian format
 */
export function exportConversationToObsidian(conversation: Conversation): string {
  const lines: string[] = [];
  
  // YAML Frontmatter
  lines.push(generateFrontmatter(conversation));
  
  // Title (H1)
  lines.push(`# ${conversation.title}`);
  lines.push('');
  
  // Callout for metadata
  lines.push('> [!info] Metadata');
  lines.push(`> **Date:** ${new Date(conversation.create_time).toLocaleString()}`);
  if (conversation.model) {
    lines.push(`> **Model:** ${conversation.model}`);
  }
  lines.push('');
  
  // Messages
  for (const message of conversation.messages) {
    lines.push(formatMessage(message));
  }
  
  // Footer with tags
  lines.push('---');
  lines.push('');
  lines.push('#chatgpt #ai-conversation');
  
  return lines.join('\n');
}

/**
 * Export to Obsidian format
 */
export function exportToObsidian(
  conversations: Conversation[], 
  options: ExportOptions
): ExportResult {
  try {
    if (conversations.length === 1) {
      // Single conversation
      return {
        success: true,
        data: exportConversationToObsidian(conversations[0]),
        filename: generateObsidianFilename(conversations[0])
      };
    } else {
      // Multiple conversations - create an index file
      const lines: string[] = [];
      
      lines.push('---');
      lines.push('title: "ChatGPT Archive Export"');
      lines.push(`date: ${new Date().toISOString().split('T')[0]}`);
      lines.push('tags:');
      lines.push('  - chatgpt');
      lines.push('  - archive');
      lines.push('---');
      lines.push('');
      lines.push('# ChatGPT Archive Export');
      lines.push('');
      lines.push(`Exported ${conversations.length} conversations on ${new Date().toLocaleString()}.`);
      lines.push('');
      lines.push('## Conversations');
      lines.push('');
      
      for (const conv of conversations) {
        const filename = generateObsidianFilename(conv, false);
        const date = new Date(conv.create_time).toISOString().split('T')[0];
        lines.push(`- [[${filename.slice(0, -3)}|${conv.title}]] (${date})`);
      }
      
      return {
        success: true,
        data: lines.join('\n'),
        filename: `archive-index-${new Date().toISOString().split('T')[0]}.md`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
}

/**
 * Generate Obsidian filename
 */
export function generateObsidianFilename(
  conversation: Conversation, 
  withExtension = true
): string {
  const date = new Date(conversation.create_time).toISOString().split('T')[0];
  const sanitized = conversation.title
    .replace(/[<>:"/\\|?*]/g, '_')
    .slice(0, 50);
  
  const filename = `${date} ${sanitized}`;
  return withExtension ? `${filename}.md` : filename;
}
