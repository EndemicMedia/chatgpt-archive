// Content script that runs on chatgpt.com
// Handles scrolling to load all conversations and extracting conversation IDs

import { extractConversationIdsFromDOM, ensureAllConversationsLoaded } from '@/utils/dom-extractor';
import { backupConversations, retryFailedConversations } from '@/utils/backup-engine';
import type { BackupProgress, BackupSettings } from '@/utils/types';

// Main content script function
export default function() {
  console.log('[ChatGPT Archive] Content script loaded');

  // Listen for messages from popup or background
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ping') {
      const isChatGPT = window.location.hostname === 'chatgpt.com';
      sendResponse({ success: true, isChatGPT });
      return true;
    }

    if (message.action === 'extractIds') {
      handleExtractIds(sendResponse);
      return true;
    }

    if (message.action === 'startBackup') {
      handleBackup(message.settings, sendResponse);
      return true;
    }

    if (message.action === 'retryFailed') {
      handleRetryFailed(message.failedIds, message.existingConversations, message.settings, sendResponse);
      return true;
    }

    if (message.action === 'cancelBackup') {
      cancelBackup();
      sendResponse({ success: true });
      return true;
    }
  });

  let isBackupCancelled = false;

  function cancelBackup() {
    isBackupCancelled = true;
  }

  async function handleExtractIds(sendResponse: (response: any) => void) {
    try {
      console.log('[ChatGPT Archive] Extracting conversation IDs from DOM...');
      
      await ensureAllConversationsLoaded((progress) => {
        browser.runtime.sendMessage({
          action: 'scrollProgress',
          progress
        }).catch(() => {});
      });
      
      const ids = extractConversationIdsFromDOM();
      
      sendResponse({ 
        success: true, 
        ids,
        count: ids.length
      });
    } catch (error) {
      console.error('[ChatGPT Archive] Extraction failed:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async function handleBackup(settings: BackupSettings | undefined, sendResponse: (response: any) => void) {
    isBackupCancelled = false;
    
    try {
      console.log('[ChatGPT Archive] Starting backup...');
      
      const onProgress = (progress: BackupProgress) => {
        if (isBackupCancelled) return;
        
        browser.runtime.sendMessage({
          action: 'backupProgress',
          progress
        }).catch(() => {});
      };

      const result = await backupConversations(onProgress, () => isBackupCancelled, settings);
      
      // Store the result for potential redownload
      await browser.storage.local.set({ lastBackupData: result.conversations });
      
      sendResponse({ success: true, result });
    } catch (error) {
      console.error('[ChatGPT Archive] Backup failed:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async function handleRetryFailed(
    failedIds: string[], 
    existingConversations: any[], 
    settings: BackupSettings | undefined,
    sendResponse: (response: any) => void
  ) {
    isBackupCancelled = false;
    
    try {
      console.log(`[ChatGPT Archive] Retrying ${failedIds.length} failed conversations...`);
      
      const onProgress = (progress: BackupProgress) => {
        if (isBackupCancelled) return;
        
        browser.runtime.sendMessage({
          action: 'backupProgress',
          progress
        }).catch(() => {});
      };

      const result = await retryFailedConversations(failedIds, onProgress, () => isBackupCancelled, settings);
      
      sendResponse({ success: true, result });
    } catch (error) {
      console.error('[ChatGPT Archive] Retry failed:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
