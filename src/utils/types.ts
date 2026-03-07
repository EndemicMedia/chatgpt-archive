// Type definitions for ChatGPT Archive extension

// ============================================================================
// Core Conversation Types
// ============================================================================

export interface CodeBlock {
  language: string;
  code: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_type: 'text' | 'code' | 'multimodal';
  model?: string;
  create_time: number;
  update_time?: number;
  code_blocks?: CodeBlock[];
  attachments?: Attachment[];
}

export interface Attachment {
  type: 'image' | 'file';
  name: string;
  size: number;
  url?: string;
  data?: string; // Base64 for local storage
}

export interface Conversation {
  id: string;
  title: string;
  create_time: number;
  update_time: number;
  messages: ConversationMessage[];
  model?: string;
  category_id?: string;
  tags?: string[];
  is_archived?: boolean;
  is_favorite?: boolean;
  metadata?: {
    total_tokens?: number;
    plugin_ids?: string[];
    source?: 'chatgpt' | 'api';
  };
}

// ============================================================================
// Category Types
// ============================================================================

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  order?: number;
}

// ============================================================================
// Archive & Storage Types
// ============================================================================

export interface ArchiveMetadata {
  version: number;
  createdAt: number;
  updatedAt: number;
  conversationCount: number;
  totalSize: number;
  lastBackupAt: number | null;
  encryptionVersion: number;
}

export interface VisibilitySettings {
  [conversationId: string]: {
    [messageId: string]: {
      hideQuestion: boolean;
      hideAnswer: boolean;
    };
  };
}

// ============================================================================
// Backup Types
// ============================================================================

export interface BackupProgress {
  phase: 'scrolling' | 'fetching' | 'downloading' | 'processing';
  current: number;
  total: number;
  message: string;
  failedIds?: string[];
}

export interface BackupResult {
  total: number;
  successful: number;
  failed: number;
  failedIds: string[];
  conversations: Conversation[];
}

export interface BackupSettings {
  rateLimit: number;
  autoDownload: boolean;
  includeSystem: boolean;
  compressOutput: boolean;
  encryptOutput: boolean;
}

export interface ScrollProgress {
  attempts: number;
  maxAttempts: number;
  currentHeight: number;
}

// ============================================================================
// API Types
// ============================================================================

export interface RawConversation {
  id: string;
  title: string;
  create_time: number;
  update_time?: number;
  mapping: Record<string, {
    message?: {
      id?: string;
      author?: { role?: string; name?: string };
      content?: {
        content_type?: string;
        parts?: (string | { content_type: string; text?: string })[];
        text?: string;
      };
      metadata?: { 
        model_slug?: string;
        finish_details?: { type: string };
      };
      create_time?: number;
      status?: string;
    };
    parent?: string;
    children?: string[];
  }>;
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = 'json' | 'markdown' | 'obsidian' | 'workflowy' | 'notion';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includeHidden: boolean;
  dateFormat: 'iso' | 'locale' | 'relative';
  categoryFilter?: string[];
  dateRange?: { start: number; end: number };
}

export interface ExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchFilters {
  query: string;
  categories?: string[];
  dateFrom?: number;
  dateTo?: number;
  models?: string[];
  hasCode?: boolean;
  hasImages?: boolean;
}

export interface SearchResult {
  conversation: Conversation;
  score: number;
  matches: {
    field: 'title' | 'content';
    indices: [number, number][];
    text: string;
  }[];
}

// ============================================================================
// Notion Integration Types
// ============================================================================

export interface NotionConfig {
  token: string;
  databaseId?: string;
  parentPageId?: string;
}

export interface NotionExportResult {
  success: boolean;
  pageId?: string;
  url?: string;
  error?: string;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface ExtensionSettings {
  // PIN & Security
  pinEnabled: boolean;
  autoLockMinutes: number;
  biometricEnabled: boolean;
  
  // Backup
  autoBackup: boolean;
  backupOnClose: boolean;
  includeSystemMessages: boolean;
  
  // Export
  defaultExportFormat: ExportFormat;
  exportPath?: string;
  
  // UI
  theme: 'light' | 'dark' | 'system';
  defaultView: 'list' | 'grid' | 'compact';
  showCodePreview: boolean;
  
  // Search
  searchInContent: boolean;
  fuzzySearch: boolean;
}

// ============================================================================
// Viewer Types
// ============================================================================

export type ViewMode = 'full' | 'summary' | 'code' | 'reading';

export interface ViewerState {
  selectedConversationId: string | null;
  searchQuery: string;
  selectedCategories: string[];
  viewMode: ViewMode;
  showHidden: boolean;
  sortBy: 'date' | 'title' | 'size';
  sortOrder: 'asc' | 'desc';
}
