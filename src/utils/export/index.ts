/**
 * Export Module - Central export coordinator
 * 
 * Coordinates exports to various formats
 */

import { Conversation, ExportFormat, ExportOptions, ExportResult } from '@/utils/types';
import { exportToMarkdown, generateMarkdownFilename } from '@/utils/export/markdown';
import { exportToObsidian, generateObsidianFilename } from '@/utils/export/obsidian';
import { exportToWorkflowy, generateOPMLFilename } from '@/utils/export/workflowy';
import { exportToNotion, NotionExporter } from '@/utils/export/notion';

export * from './markdown';
export * from './obsidian';
export * from './workflowy';
export * from './notion';

/**
 * Default export options
 */
export const defaultExportOptions: ExportOptions = {
  format: 'json',
  includeMetadata: true,
  includeHidden: false,
  dateFormat: 'iso'
};

/**
 * Export conversations to the specified format
 */
export function exportConversations(
  conversations: Conversation[],
  options: Partial<ExportOptions> = {}
): ExportResult {
  const fullOptions = { ...defaultExportOptions, ...options };
  
  switch (fullOptions.format) {
    case 'markdown':
      return exportToMarkdown(conversations, fullOptions);
    
    case 'obsidian':
      return exportToObsidian(conversations, fullOptions);
    
    case 'workflowy':
      return exportToWorkflowy(conversations, fullOptions);
    
    case 'json':
      return exportToJSON(conversations, fullOptions);
    
    default:
      return {
        success: false,
        error: `Unsupported export format: ${fullOptions.format}`
      };
  }
}

/**
 * Export to JSON format
 */
function exportToJSON(conversations: Conversation[], options: ExportOptions): ExportResult {
  try {
    const data = JSON.stringify(conversations, null, 2);
    return {
      success: true,
      data,
      filename: `chatgpt-archive-${new Date().toISOString().split('T')[0]}.json`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSON export failed'
    };
  }
}

/**
 * Generate filename based on format
 */
export function generateFilename(
  conversation: Conversation,
  format: ExportFormat
): string {
  switch (format) {
    case 'markdown':
      return generateMarkdownFilename(conversation);
    case 'obsidian':
      return generateObsidianFilename(conversation);
    case 'workflowy':
      return generateOPMLFilename(conversation);
    case 'json':
      return `${conversation.id || 'conversation'}.json`;
    default:
      return `export-${Date.now()}.txt`;
  }
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'markdown':
    case 'obsidian':
      return 'md';
    case 'workflowy':
      return 'opml';
    case 'json':
      return 'json';
    case 'notion':
      return ''; // Notion doesn't have a file extension
    default:
      return 'txt';
  }
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'markdown':
    case 'obsidian':
      return 'text/markdown';
    case 'workflowy':
      return 'text/x-opml+xml';
    case 'json':
      return 'application/json';
    default:
      return 'text/plain';
  }
}
