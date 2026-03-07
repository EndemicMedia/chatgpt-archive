/**
 * Workflowy Export Module
 * 
 * Exports conversations to OPML format for Workflowy import
 */

import { Conversation, ExportOptions, ExportResult } from '@/utils/types';

/**
 * Escape XML special characters
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escape text for OPML _note attribute (handles newlines)
 */
function escapeNote(text: string): string {
  return escapeXML(text)
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '');
}

/**
 * Format date for OPML
 */
function formatOPMLDate(timestamp: number): string {
  const date = new Date(timestamp);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${days[date.getUTCDay()]}, ${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} ${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}:${date.getUTCSeconds().toString().padStart(2, '0')} GMT`;
}

/**
 * Export a single message to OPML outline
 */
function exportMessageToOPML(
  message: Conversation['messages'][0], 
  index: number
): string {
  const role = message.role === 'user' ? 'User' : 'Assistant';
  const label = message.role === 'user' ? `Q${Math.floor(index / 2) + 1}` : `A${Math.floor(index / 2) + 1}`;
  
  let content = message.content;
  
  // Handle code blocks
  if (message.code_blocks && message.code_blocks.length > 0) {
    for (const block of message.code_blocks) {
      const codeBlock = `\`\`\`${block.language || ''}\n${block.code}\n\`\`\``;
      content = content.replace(block.code, codeBlock);
    }
  }
  
  const escapedText = escapeXML(`${label}: ${role}`);
  const escapedNote = escapeNote(content);
  
  return `      <outline text="${escapedText}" _note="${escapedNote}"/>`;
}

/**
 * Export a single conversation to OPML
 */
function exportConversationToOPML(conversation: Conversation, indent = 2): string {
  const spaces = ' '.repeat(indent);
  const escapedTitle = escapeXML(conversation.title);
  const dateStr = formatOPMLDate(conversation.create_time);
  
  let lines: string[] = [];
  
  lines.push(`${spaces}<outline text="${escapedTitle}">`);
  
  // Add metadata as child
  lines.push(`${spaces}  <outline text="📅 ${escapeXML(new Date(conversation.create_time).toLocaleDateString())}"/>`);
  if (conversation.model) {
    lines.push(`${spaces}  <outline text="🤖 ${escapeXML(conversation.model)}"/>`);
  }
  
  // Add messages
  for (let i = 0; i < conversation.messages.length; i++) {
    const message = conversation.messages[i];
    lines.push(exportMessageToOPML(message, i));
  }
  
  lines.push(`${spaces}</outline>`);
  
  return lines.join('\n');
}

/**
 * Export to Workflowy OPML format
 */
export function exportToWorkflowy(
  conversations: Conversation[], 
  options: ExportOptions
): ExportResult {
  try {
    const now = new Date();
    const lines: string[] = [];
    
    // XML declaration
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<opml version="2.0">');
    
    // Head
    lines.push('  <head>');
    lines.push(`    <title>ChatGPT Archive Export</title>`);
    lines.push(`    <dateCreated>${formatOPMLDate(now.getTime())}</dateCreated>`);
    lines.push(`    <dateModified>${formatOPMLDate(now.getTime())}</dateModified>`);
    lines.push('  </head>');
    
    // Body
    lines.push('  <body>');
    
    // Root outline containing all conversations
    lines.push(`    <outline text="ChatGPT Archive (${conversations.length} conversations)">`);
    
    for (const conversation of conversations) {
      lines.push(exportConversationToOPML(conversation, 6));
    }
    
    lines.push('    </outline>');
    lines.push('  </body>');
    lines.push('</opml>');
    
    return {
      success: true,
      data: lines.join('\n'),
      filename: `chatgpt-archive-${now.toISOString().split('T')[0]}.opml`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
}

/**
 * Export single conversation to OPML
 */
export function exportConversationToWorkflowy(conversation: Conversation): ExportResult {
  return exportToWorkflowy([conversation], {
    format: 'workflowy',
    includeMetadata: true,
    includeHidden: false,
    dateFormat: 'iso'
  });
}

/**
 * Generate OPML filename
 */
export function generateOPMLFilename(conversation?: Conversation): string {
  const date = new Date().toISOString().split('T')[0];
  
  if (conversation) {
    const sanitized = conversation.title
      .replace(/[<>:"/\\|?*]/g, '_')
      .slice(0, 30);
    return `${date}-${sanitized}.opml`;
  }
  
  return `chatgpt-archive-${date}.opml`;
}
