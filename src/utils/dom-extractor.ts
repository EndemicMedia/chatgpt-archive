// DOM extraction utilities for ChatGPT sidebar

import type { ScrollProgress, RawConversation, Conversation, ConversationMessage } from '@/utils/types';

/**
 * Scroll the sidebar to ensure all conversations are loaded
 * ChatGPT uses lazy loading/infinite scroll in the sidebar
 */
export async function ensureAllConversationsLoaded(
  onProgress?: (progress: ScrollProgress) => void
): Promise<void> {
  const historyDiv = document.getElementById('history');
  if (!historyDiv) {
    console.warn('[ChatGPT Backup] Could not find #history div');
    return;
  }
  
  // Find the scrollable container within the history div
  // ChatGPT's sidebar structure may vary, so we try multiple selectors
  const scrollContainer = historyDiv.querySelector('[class*="scroll"]') || 
                         historyDiv.querySelector('[data-testid*="scroll"]') ||
                         historyDiv;
  
  let previousHeight = 0;
  let scrollAttempts = 0;
  const maxScrollAttempts = 50; // Increased for users with many conversations
  
  while (scrollAttempts < maxScrollAttempts) {
    const currentHeight = scrollContainer.scrollHeight;
    
    if (currentHeight === previousHeight) {
      // Wait a bit and check again to confirm we've reached the end
      await sleep(1000);
      if (scrollContainer.scrollHeight === currentHeight) {
        break; // No more content loading
      }
    }
    
    previousHeight = currentHeight;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    
    if (onProgress) {
      onProgress({
        attempts: scrollAttempts + 1,
        maxAttempts,
        currentHeight
      });
    }
    
    await sleep(500); // Wait for content to load
    scrollAttempts++;
  }
  
  console.log(`[ChatGPT Backup] Scrolled ${scrollAttempts} times, final height: ${previousHeight}px`);
}

/**
 * Extract all conversation IDs from the sidebar DOM
 */
export function extractConversationIdsFromDOM(): string[] {
  const historyDiv = document.getElementById('history');
  if (!historyDiv) {
    throw new Error('Could not find #history div. Make sure the sidebar is open.');
  }
  
  // Get all links in the history sidebar that point to conversations
  const links = historyDiv.querySelectorAll('a[href^="/c/"]');
  const ids: string[] = [];
  
  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) continue;
    
    // Extract UUID from /c/UUID or /c/UUID/... patterns
    // UUID pattern: 8-4-4-4-12 hex characters
    const match = href.match(/\/c\/([a-f0-9-]{36})/i);
    if (match && match[1]) {
      ids.push(match[1]);
    }
  }
  
  // Remove duplicates while preserving order
  const uniqueIds = [...new Set(ids)];
  console.log(`[ChatGPT Backup] Found ${uniqueIds.length} unique conversation IDs`);
  
  return uniqueIds;
}

export function sleep(ms: number = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
