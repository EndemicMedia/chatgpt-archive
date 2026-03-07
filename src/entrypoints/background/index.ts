// Background script for ChatGPT Archive Extension
// Handles cross-origin requests and manages extension state

console.log('[ChatGPT Archive] Background script loaded');

// Listen for extension installation
browser.runtime.onInstalled.addListener((details) => {
  console.log('[ChatGPT Archive] Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Open welcome page or instructions
    browser.tabs.create({
      url: 'https://github.com/yourusername/chatgpt-backup#readme'
    });
  }
});

// Listen for messages from content script or popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getConversations') {
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'download') {
    const { data, filename } = message;
    browser.downloads.download({
      url: `data:text/plain;charset=utf-8,${encodeURIComponent(data)}`,
      filename: filename,
      saveAs: true
    }).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

// Keep service worker alive during long operations
let keepAliveInterval: number | null = null;

export function startKeepAlive() {
  if (keepAliveInterval) return;
  
  keepAliveInterval = window.setInterval(() => {
    console.log('[ChatGPT Archive] Keeping service worker alive');
  }, 20000);
}

export function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Default export for WXT
export default function() {
  // Background script runs on installation
  console.log('[ChatGPT Archive] Background initialized');
}
