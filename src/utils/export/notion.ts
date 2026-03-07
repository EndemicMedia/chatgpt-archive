/**
 * Notion Export Module
 * 
 * Exports conversations to Notion using the Notion API
 * Users must provide their own integration token
 */

import { Client } from '@notionhq/client';
import { Conversation, NotionConfig, NotionExportResult, ExportOptions } from '@/utils/types';

/**
 * Notion Exporter class
 */
export class NotionExporter {
  private client: Client | null = null;
  private config: NotionConfig;

  constructor(config: NotionConfig) {
    this.config = config;
    this.client = new Client({ auth: config.token });
  }

  /**
   * Validate the Notion token by making a test request
   */
  async validateToken(): Promise<{ valid: boolean; error?: string }> {
    try {
      if (!this.client) {
        return { valid: false, error: 'Client not initialized' };
      }
      
      // Make a simple API call to validate
      await this.client.users.me({});
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid token' 
      };
    }
  }

  /**
   * Create a database for conversations
   */
  async createDatabase(parentPageId: string): Promise<string> {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    const database = await this.client.databases.create({
      parent: { page_id: parentPageId },
      title: [
        {
          type: 'text',
          text: { content: 'ChatGPT Conversations' }
        }
      ],
      is_inline: true,
      properties: {
        'Name': {
          title: {}
        },
        'Date': {
          date: {}
        },
        'Model': {
          select: {
            options: [
              { name: 'GPT-4', color: 'purple' },
              { name: 'GPT-4o', color: 'purple' },
              { name: 'GPT-3.5', color: 'blue' },
              { name: 'o1', color: 'green' },
              { name: 'Other', color: 'gray' }
            ]
          }
        },
        'Category': {
          select: {
            options: [
              { name: 'Work', color: 'blue' },
              { name: 'Personal', color: 'red' },
              { name: 'Ideas', color: 'yellow' },
              { name: 'Learning', color: 'green' },
              { name: 'Code', color: 'cyan' },
              { name: 'Research', color: 'purple' }
            ]
          }
        },
        'Tags': {
          multi_select: {
            options: []
          }
        },
        'Message Count': {
          number: {
            format: 'number'
          }
        },
        'Exported': {
          checkbox: {}
        }
      }
    });

    return database.id;
  }

  /**
   * Create a page for a conversation
   */
  async createConversationPage(
    conversation: Conversation,
    databaseId: string
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    // Build page properties
    const properties: any = {
      'Name': {
        title: [
          {
            text: { content: conversation.title }
          }
        ]
      },
      'Date': {
        date: {
          start: new Date(conversation.create_time).toISOString().split('T')[0]
        }
      },
      'Message Count': {
        number: conversation.messages.length
      },
      'Exported': {
        checkbox: true
      }
    };

    // Add model if available
    if (conversation.model) {
      const modelName = conversation.model.includes('4o') ? 'GPT-4o' :
                       conversation.model.includes('gpt-4') ? 'GPT-4' :
                       conversation.model.includes('3.5') ? 'GPT-3.5' :
                       conversation.model.includes('o1') ? 'o1' : 'Other';
      properties['Model'] = {
        select: { name: modelName }
      };
    }

    // Add category if available
    if (conversation.category_id) {
      // Map category ID to name (simplified)
      const categoryMap: Record<string, string> = {
        'cat-blue': 'Work',
        'cat-red': 'Personal',
        'cat-yellow': 'Ideas',
        'cat-green': 'Learning',
        'cat-cyan': 'Code',
        'cat-purple': 'Research'
      };
      const categoryName = categoryMap[conversation.category_id];
      if (categoryName) {
        properties['Category'] = {
          select: { name: categoryName }
        };
      }
    }

    // Add tags
    if (conversation.tags && conversation.tags.length > 0) {
      properties['Tags'] = {
        multi_select: conversation.tags.map(tag => ({ name: tag }))
      };
    }

    // Build content blocks
    const children: any[] = [];

    // Add header
    children.push({
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [{ text: { content: conversation.title } }]
      }
    });

    // Add metadata callout
    const metadataParts: string[] = [];
    metadataParts.push(`Date: ${new Date(conversation.create_time).toLocaleString()}`);
    if (conversation.model) metadataParts.push(`Model: ${conversation.model}`);
    metadataParts.push(`Messages: ${conversation.messages.length}`);

    children.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [{ text: { content: metadataParts.join(' • ') } }],
        icon: { emoji: '📋' },
        color: 'blue_background'
      }
    });

    children.push({ type: 'divider', divider: {} });

    // Add messages
    for (let i = 0; i < conversation.messages.length; i++) {
      const message = conversation.messages[i];
      const role = message.role === 'user' ? 'User' : 'Assistant';
      const number = Math.floor(i / 2) + 1;
      const label = message.role === 'user' ? `Q${number}` : `A${number}`;

      // Role heading
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: `${label}: ${role}` } }]
        }
      });

      // Message content
      const content = message.content;
      const paragraphs = content.split('\n\n');

      for (const paragraph of paragraphs) {
        if (!paragraph.trim()) continue;

        // Check if it's a code block
        const codeBlockMatch = paragraph.match(/^```(\w*)\n?([\s\S]*?)```$/);
        if (codeBlockMatch) {
          children.push({
            object: 'block',
            type: 'code',
            code: {
              rich_text: [{ text: { content: codeBlockMatch[2].trim() } }],
              language: codeBlockMatch[1] || 'plain text'
            }
          });
        } else {
          // Regular paragraph
          children.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: paragraph } }]
            }
          });
        }
      }

      // Add divider between messages
      if (i < conversation.messages.length - 1) {
        children.push({ type: 'divider', divider: {} });
      }
    }

    // Create the page
    const page = await this.client.pages.create({
      parent: { database_id: databaseId },
      properties,
      children
    });

    return page.id;
  }

  /**
   * Export a conversation to Notion
   */
  async exportConversation(conversation: Conversation): Promise<NotionExportResult> {
    try {
      if (!this.config.databaseId && !this.config.parentPageId) {
        return {
          success: false,
          error: 'No database ID or parent page ID provided'
        };
      }

      let databaseId = this.config.databaseId;

      // Create database if needed
      if (!databaseId && this.config.parentPageId) {
        databaseId = await this.createDatabase(this.config.parentPageId);
        this.config.databaseId = databaseId;
      }

      if (!databaseId) {
        return {
          success: false,
          error: 'Failed to create or find database'
        };
      }

      const pageId = await this.createConversationPage(conversation, databaseId);

      return {
        success: true,
        pageId,
        url: `https://notion.so/${pageId.replace(/-/g, '')}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export multiple conversations to Notion
   */
  async exportConversations(conversations: Conversation[]): Promise<{
    success: boolean;
    exported: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let exported = 0;

    for (const conversation of conversations) {
      const result = await this.exportConversation(conversation);
      if (result.success) {
        exported++;
      } else {
        errors.push(`${conversation.title}: ${result.error}`);
      }

      // Rate limiting - wait 350ms between requests (3 requests per second)
      await new Promise(resolve => setTimeout(resolve, 350));
    }

    return {
      success: errors.length === 0,
      exported,
      failed: conversations.length - exported,
      errors
    };
  }
}

/**
 * Export a conversation to Notion (convenience function)
 */
export async function exportToNotion(
  conversation: Conversation,
  config: NotionConfig
): Promise<NotionExportResult> {
  const exporter = new NotionExporter(config);
  return exporter.exportConversation(conversation);
}

/**
 * Export multiple conversations to Notion (convenience function)
 */
export async function exportConversationsToNotion(
  conversations: Conversation[],
  config: NotionConfig
): Promise<{
  success: boolean;
  exported: number;
  failed: number;
  errors: string[];
}> {
  const exporter = new NotionExporter(config);
  return exporter.exportConversations(conversations);
}
