// Backup engine that orchestrates the full backup process

import { loadToken, fetchConversation, parseConversation } from '@/utils/api';
import { extractConversationIdsFromDOM, ensureAllConversationsLoaded, sleep } from '@/utils/dom-extractor';
import type { BackupProgress, BackupResult, Conversation, BackupSettings } from '@/utils/types';

const DEFAULT_SETTINGS: BackupSettings = {
  rateLimit: 1000,
  autoDownload: true,
  includeSystem: false
};

/**
 * Main backup function that extracts and downloads all conversations
 */
export async function backupConversations(
  onProgress?: (progress: BackupProgress) => void,
  isCancelled?: () => boolean,
  settings: BackupSettings = DEFAULT_SETTINGS
): Promise<BackupResult> {
  
  const rateLimitMs = settings.rateLimit || 1000;
  
  // Phase 1: Scroll to load all conversations
  onProgress?.({
    phase: 'scrolling',
    current: 0,
    total: 0,
    message: 'Loading all conversations...'
  });
  
  await ensureAllConversationsLoaded((scrollProgress) => {
    onProgress?.({
      phase: 'scrolling',
      current: scrollProgress.attempts,
      total: scrollProgress.maxAttempts,
      message: `Scrolling sidebar... (${scrollProgress.attempts}/${scrollProgress.maxAttempts})`
    });
  });
  
  if (isCancelled?.()) {
    throw new Error('Backup cancelled');
  }
  
  // Phase 2: Extract conversation IDs
  const conversationIds = extractConversationIdsFromDOM();
  
  if (conversationIds.length === 0) {
    throw new Error('No conversations found. Make sure you are logged in and the sidebar is open.');
  }
  
  // Phase 3: Fetch all conversations
  const token = await loadToken();
  const conversations: Conversation[] = [];
  const failedIds: string[] = [];
  
  console.log(`[ChatGPT Backup] Fetching ${conversationIds.length} conversations...`);
  
  for (let i = 0; i < conversationIds.length; i++) {
    if (isCancelled?.()) {
      throw new Error('Backup cancelled');
    }
    
    const id = conversationIds[i];
    
    onProgress?.({
      phase: 'fetching',
      current: i + 1,
      total: conversationIds.length,
      message: `Fetching conversation ${i + 1}/${conversationIds.length}`,
      failedIds
    });
    
    await sleep(rateLimitMs);
    
    const rawConversation = await fetchConversation(token, id);
    
    if (rawConversation) {
      try {
        const conversation = parseConversation(rawConversation, settings.includeSystem);
        conversations.push(conversation);
      } catch (parseError) {
        console.error(`[ChatGPT Backup] Failed to parse conversation ${id}:`, parseError);
        failedIds.push(id);
      }
    } else {
      failedIds.push(id);
    }
  }
  
  if (isCancelled?.()) {
    throw new Error('Backup cancelled');
  }
  
  onProgress?.({
    phase: 'downloading',
    current: conversations.length,
    total: conversations.length,
    message: 'Download complete!',
    failedIds
  });
  
  return {
    total: conversationIds.length,
    successful: conversations.length,
    failed: failedIds.length,
    failedIds,
    conversations
  };
}

/**
 * Retry failed conversations
 */
export async function retryFailedConversations(
  failedIds: string[],
  onProgress?: (progress: BackupProgress) => void,
  isCancelled?: () => boolean,
  settings: BackupSettings = DEFAULT_SETTINGS
): Promise<BackupResult> {
  
  const rateLimitMs = settings.rateLimit || 1000;
  const token = await loadToken();
  const conversations: Conversation[] = [];
  const stillFailedIds: string[] = [];
  
  console.log(`[ChatGPT Backup] Retrying ${failedIds.length} failed conversations...`);
  
  for (let i = 0; i < failedIds.length; i++) {
    if (isCancelled?.()) {
      throw new Error('Retry cancelled');
    }
    
    const id = failedIds[i];
    
    onProgress?.({
      phase: 'fetching',
      current: i + 1,
      total: failedIds.length,
      message: `Retrying ${i + 1}/${failedIds.length}: ${id.slice(0, 8)}...`,
      failedIds: stillFailedIds
    });
    
    await sleep(rateLimitMs);
    
    const rawConversation = await fetchConversation(token, id);
    
    if (rawConversation) {
      try {
        const conversation = parseConversation(rawConversation, settings.includeSystem);
        conversations.push(conversation);
      } catch (parseError) {
        console.error(`[ChatGPT Backup] Failed to parse conversation ${id}:`, parseError);
        stillFailedIds.push(id);
      }
    } else {
      stillFailedIds.push(id);
    }
  }
  
  return {
    total: failedIds.length,
    successful: conversations.length,
    failed: stillFailedIds.length,
    failedIds: stillFailedIds,
    conversations
  };
}

/**
 * Download conversations as JSON file
 */
export async function downloadJson(data: Conversation[]): Promise<void> {
  const jsonString = JSON.stringify(data, null, 2);
  const jsonBlob = new Blob([jsonString], { type: 'application/json' });
  
  const url = URL.createObjectURL(jsonBlob);
  const filename = `gpt-backup-${getDateFormat(new Date())}.json`;
  
  try {
    await browser.downloads.download({
      url,
      filename,
      saveAs: false
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

function getDateFormat(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}
