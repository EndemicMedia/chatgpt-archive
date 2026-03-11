// Popup script for ChatGPT Backup Extension

import type { BackupProgress, BackupResult, Conversation } from '../utils/types';
import { isArchiveInitialized } from '@/utils/storage';

// DOM Elements
const statusSection = document.getElementById('status-section')!;
const statusDot = document.querySelector('.status-dot') as HTMLElement;
const statusText = document.getElementById('status-text')!;
const infoSection = document.getElementById('info-section')!;
const conversationCount = document.getElementById('conversation-count')!;
const estimatedTime = document.getElementById('estimated-time')!;
const progressSection = document.getElementById('progress-section')!;
const progressBar = document.getElementById('progress-bar') as HTMLElement;
const progressMessage = document.getElementById('progress-message')!;
const progressTime = document.getElementById('progress-time')!;
const progressStats = document.getElementById('progress-stats')!;
const resultSection = document.getElementById('result-section')!;
const resultSuccess = document.getElementById('result-success')!;
const resultFailed = document.getElementById('result-failed')!;
const resultTotal = document.getElementById('result-total')!;
const resultFailedIds = document.getElementById('result-failed-ids')!;
const btnExtract = document.getElementById('btn-extract') as HTMLButtonElement;
const btnBackup = document.getElementById('btn-backup') as HTMLButtonElement;
const btnCancel = document.getElementById('btn-cancel') as HTMLButtonElement;
const btnRetry = document.getElementById('btn-retry') as HTMLButtonElement;
const btnDownload = document.getElementById('btn-download') as HTMLButtonElement;
const btnNewBackup = document.getElementById('btn-new-backup') as HTMLButtonElement;
const btnRedownload = document.getElementById('btn-redownload') as HTMLButtonElement;
const exportSection = document.getElementById('export-section')!;
const lastBackupSection = document.getElementById('last-backup-section')!;
const lastBackupDate = document.getElementById('last-backup-date')!;
const lastBackupCount = document.getElementById('last-backup-count')!;
const btnToggleSettings = document.getElementById('btn-toggle-settings') as HTMLButtonElement;
const settingsPanel = document.getElementById('settings-panel')!;
const btnSaveSettings = document.getElementById('btn-save-settings') as HTMLButtonElement;
const btnResetSettings = document.getElementById('btn-reset-settings') as HTMLButtonElement;
const settingRateLimit = document.getElementById('setting-rate-limit') as HTMLInputElement;
const settingAutoDownload = document.getElementById('setting-auto-download') as HTMLInputElement;
const settingIncludeSystem = document.getElementById('setting-include-system') as HTMLInputElement;

// State
let isBackingUp = false;
let currentTabId: number | null = null;
let lastBackupResult: BackupResult | null = null;
let backupStartTime: number = 0;
let currentConversations: Conversation[] = [];
let currentFailedIds: string[] = [];

// Default settings
const defaultSettings = {
  rateLimit: 1000,
  autoDownload: true,
  includeSystem: false
};

// Initialize
async function init() {
  console.log('[ChatGPT Backup Popup] Initializing...');
  
  // Get current tab
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  currentTabId = tabs[0]?.id || null;
  
  // Load settings
  await loadSettings();
  
  // Load last backup info
  await loadLastBackupInfo();
  
  // Check if we're on ChatGPT
  await checkStatus();
  
  // Set up event listeners
  setupEventListeners();
  
  // Listen for messages from content script
  browser.runtime.onMessage.addListener(handleMessage);
  
  // Check if archive is initialized and show guidance
  await checkArchiveStatus();
}

async function loadSettings() {
  const stored = await browser.storage.local.get(['settings']);
  const settings = stored.settings || defaultSettings;
  
  settingRateLimit.value = settings.rateLimit.toString();
  settingAutoDownload.checked = settings.autoDownload;
  settingIncludeSystem.checked = settings.includeSystem;
}

async function saveSettings() {
  const settings = {
    rateLimit: parseInt(settingRateLimit.value) || 1000,
    autoDownload: settingAutoDownload.checked,
    includeSystem: settingIncludeSystem.checked
  };
  
  await browser.storage.local.set({ settings });
  
  // Show feedback
  btnSaveSettings.textContent = 'Saved!';
  setTimeout(() => {
    btnSaveSettings.textContent = 'Save';
  }, 1500);
}

async function resetSettings() {
  settingRateLimit.value = defaultSettings.rateLimit.toString();
  settingAutoDownload.checked = defaultSettings.autoDownload;
  settingIncludeSystem.checked = defaultSettings.includeSystem;
  await saveSettings();
}

async function loadLastBackupInfo() {
  const stored = await browser.storage.local.get(['lastBackup']);
  if (stored.lastBackup) {
    const { date, count, total } = stored.lastBackup;
    const backupDate = new Date(date);
    const dateStr = backupDate.toLocaleDateString() + ' ' + backupDate.toLocaleTimeString();
    
    lastBackupSection.classList.remove('hidden');
    lastBackupDate.textContent = dateStr;
    lastBackupCount.textContent = `${count} of ${total} conversations`;
    btnRedownload.classList.remove('hidden');
  }
}

async function saveLastBackupInfo(result: BackupResult) {
  const lastBackup = {
    date: new Date().toISOString(),
    count: result.successful,
    total: result.total
  };
  await browser.storage.local.set({ lastBackup });
}

async function checkStatus() {
  if (!currentTabId) {
    setStatus('error', 'Cannot access current tab');
    return;
  }
  
  const tab = await browser.tabs.get(currentTabId);
  
  if (tab.url?.startsWith('https://chatgpt.com')) {
    try {
      const response = await browser.tabs.sendMessage(currentTabId, { action: 'ping' });
      
      if (response.isChatGPT) {
        setStatus('ready', 'Ready to backup');
        btnExtract.disabled = false;
        btnBackup.disabled = false;
        exportSection.classList.remove('hidden');
      }
    } catch (error) {
      setStatus('error', 'Please refresh the ChatGPT page first');
    }
  } else {
    setStatus('error', 'Navigate to chatgpt.com');
    btnExtract.disabled = true;
    btnBackup.disabled = true;
  }
}

function setStatus(type: 'ready' | 'error' | 'loading', message: string) {
  statusText.textContent = message;
  statusDot.className = 'status-dot';
  
  if (type === 'ready') {
    statusDot.classList.add('ready');
  } else if (type === 'error') {
    statusDot.classList.add('error');
  }
}

function setupEventListeners() {
  btnExtract.addEventListener('click', handleExtract);
  btnBackup.addEventListener('click', handleBackup);
  btnCancel.addEventListener('click', handleCancel);
  btnRetry.addEventListener('click', handleRetry);
  btnDownload.addEventListener('click', () => handleDownload());
  btnNewBackup.addEventListener('click', resetUI);
  btnRedownload.addEventListener('click', () => handleRedownload());
  
  btnToggleSettings.addEventListener('click', toggleSettings);
  btnSaveSettings.addEventListener('click', saveSettings);
  btnResetSettings.addEventListener('click', resetSettings);
}

function toggleSettings() {
  settingsPanel.classList.toggle('hidden');
  btnToggleSettings.classList.toggle('active');
}

async function handleExtract() {
  if (!currentTabId) return;
  
  btnExtract.disabled = true;
  btnBackup.disabled = true;
  setStatus('loading', 'Counting conversations...');
  
  try {
    const response = await browser.tabs.sendMessage(currentTabId, { action: 'extractIds' });
    
    if (response.success) {
      infoSection.classList.remove('hidden');
      conversationCount.textContent = response.count.toString();
      
      const rateLimit = parseInt(settingRateLimit.value) || 1000;
      const estimatedSeconds = response.count * (rateLimit / 1000) + 30;
      const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
      estimatedTime.textContent = `~${estimatedMinutes} minute${estimatedMinutes !== 1 ? 's' : ''}`;
      
      setStatus('ready', `Found ${response.count} conversations`);
    } else {
      setStatus('error', response.error || 'Failed to extract');
    }
  } catch (error) {
    setStatus('error', 'Extension error. Try refreshing the page.');
    console.error(error);
  }
  
  btnExtract.disabled = false;
  btnBackup.disabled = false;
}

async function handleBackup() {
  if (!currentTabId) return;
  
  isBackingUp = true;
  backupStartTime = Date.now();
  
  // Update UI
  btnExtract.classList.add('hidden');
  btnBackup.classList.add('hidden');
  btnCancel.classList.remove('hidden');
  infoSection.classList.add('hidden');
  exportSection.classList.add('hidden');
  progressSection.classList.remove('hidden');
  resultSection.classList.add('hidden');
  lastBackupSection.classList.add('hidden');
  
  setStatus('loading', 'Backing up...');
  
  try {
    const settings = await browser.storage.local.get(['settings']);
    const response = await browser.tabs.sendMessage(currentTabId, { 
      action: 'startBackup',
      settings: settings.settings || defaultSettings
    });
    
    if (response.success) {
      await showResult(response.result);
    } else {
      showError(response.error || 'Backup failed');
    }
  } catch (error) {
    showError('Extension error. Try refreshing the page.');
    console.error(error);
  }
  
  isBackingUp = false;
  btnCancel.classList.add('hidden');
}

async function handleRetry() {
  if (!currentTabId || currentFailedIds.length === 0) return;
  
  isBackingUp = true;
  backupStartTime = Date.now();
  
  // Update UI
  btnRetry.classList.add('hidden');
  btnDownload.classList.add('hidden');
  btnNewBackup.classList.add('hidden');
  btnCancel.classList.remove('hidden');
  resultSection.classList.add('hidden');
  progressSection.classList.remove('hidden');
  
  setStatus('loading', `Retrying ${currentFailedIds.length} failed conversations...`);
  
  try {
    const settings = await browser.storage.local.get(['settings']);
    const response = await browser.tabs.sendMessage(currentTabId, { 
      action: 'retryFailed',
      failedIds: currentFailedIds,
      existingConversations: currentConversations,
      settings: settings.settings || defaultSettings
    });
    
    if (response.success) {
      // Merge results
      const mergedResult: BackupResult = {
        total: lastBackupResult?.total || response.result.total,
        successful: currentConversations.length + response.result.successful,
        failed: response.result.failed,
        failedIds: response.result.failedIds,
        conversations: [...currentConversations, ...response.result.conversations]
      };
      await showResult(mergedResult);
    } else {
      showError(response.error || 'Retry failed');
    }
  } catch (error) {
    showError('Extension error. Try refreshing the page.');
    console.error(error);
  }
  
  isBackingUp = false;
  btnCancel.classList.add('hidden');
}

async function handleCancel() {
  if (!currentTabId) return;
  
  await browser.tabs.sendMessage(currentTabId, { action: 'cancelBackup' });
  isBackingUp = false;
  
  progressMessage.textContent = 'Cancelled';
  btnCancel.classList.add('hidden');
  btnExtract.classList.remove('hidden');
  btnBackup.classList.remove('hidden');
}

function handleMessage(message: any) {
  if (message.action === 'scrollProgress') {
    updateProgress({
      phase: 'scrolling',
      current: message.progress.attempts,
      total: message.progress.maxAttempts,
      message: `Loading conversations... (${message.progress.attempts}/${message.progress.maxAttempts})`
    });
  }
  
  if (message.action === 'backupProgress') {
    updateProgress(message.progress);
  }
}

function updateProgress(progress: BackupProgress) {
  const percent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;
  
  progressBar.style.width = `${percent}%`;
  progressMessage.textContent = progress.message;
  
  // Calculate time remaining
  if (backupStartTime && progress.current > 0 && progress.total > 0) {
    const elapsed = Date.now() - backupStartTime;
    const rate = elapsed / progress.current;
    const remaining = Math.round((progress.total - progress.current) * rate / 1000);
    
    if (remaining > 60) {
      const mins = Math.ceil(remaining / 60);
      progressTime.textContent = `~${mins} min remaining`;
    } else if (remaining > 0) {
      progressTime.textContent = `~${remaining}s remaining`;
    } else {
      progressTime.textContent = 'Finishing up...';
    }
  }
  
  if (progress.failedIds && progress.failedIds.length > 0) {
    progressStats.textContent = `${progress.current}/${progress.total} • ${progress.failedIds.length} failed`;
  } else {
    progressStats.textContent = `${progress.current}/${progress.total}`;
  }
}

async function showResult(result: BackupResult) {
  progressSection.classList.add('hidden');
  resultSection.classList.remove('hidden');
  
  lastBackupResult = result;
  currentConversations = result.conversations;
  currentFailedIds = result.failedIds;
  
  resultSuccess.textContent = result.successful.toString();
  resultFailed.textContent = result.failed.toString();
  resultTotal.textContent = result.total.toString();
  
  if (result.failedIds.length > 0) {
    resultFailedIds.classList.remove('hidden');
    resultFailedIds.textContent = `Failed IDs: ${result.failedIds.map(id => id.slice(0, 8)).join(', ')}...`;
    btnRetry.classList.remove('hidden');
  } else {
    resultFailedIds.classList.add('hidden');
    btnRetry.classList.add('hidden');
  }
  
  btnDownload.classList.remove('hidden');
  btnNewBackup.classList.remove('hidden');
  
  await saveLastBackupInfo(result);
  
  // Auto-download if enabled
  const settings = await browser.storage.local.get(['settings']);
  if (settings.settings?.autoDownload !== false) {
    await handleDownload();
  }
  
  setStatus('ready', 'Backup complete!');
}

function showError(error: string) {
  progressSection.classList.add('hidden');
  setStatus('error', error);
  
  btnCancel.classList.add('hidden');
  btnExtract.classList.remove('hidden');
  btnBackup.classList.remove('hidden');
  btnExtract.disabled = false;
  btnBackup.disabled = false;
}

function resetUI() {
  // Reset all UI elements to initial state
  resultSection.classList.add('hidden');
  progressSection.classList.add('hidden');
  infoSection.classList.add('hidden');
  
  btnRetry.classList.add('hidden');
  btnDownload.classList.add('hidden');
  btnNewBackup.classList.add('hidden');
  btnExtract.classList.remove('hidden');
  btnBackup.classList.remove('hidden');
  exportSection.classList.remove('hidden');
  
  progressBar.style.width = '0%';
  progressMessage.textContent = 'Initializing...';
  progressTime.textContent = '';
  progressStats.textContent = '';
  
  setStatus('ready', 'Ready to backup');
  
  // Reload last backup info
  loadLastBackupInfo();
}

async function handleDownload(conversations?: Conversation[]) {
  const data = conversations || currentConversations;
  if (!data || data.length === 0) {
    console.error('[ChatGPT Backup] No data to download');
    return;
  }
  
  const format = document.querySelector('input[name="export-format"]:checked') as HTMLInputElement;
  const formatValue = format?.value || 'json';
  
  let content: string;
  let mimeType: string;
  let extension: string;
  
  switch (formatValue) {
    case 'markdown':
      content = convertToMarkdown(data);
      mimeType = 'text/markdown';
      extension = 'md';
      break;
    case 'html':
      content = convertToHTML(data);
      mimeType = 'text/html';
      extension = 'html';
      break;
    case 'json':
    default:
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      extension = 'json';
      break;
  }
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const filename = `gpt-backup-${getDateFormat(new Date())}.${extension}`;
  
  try {
    await browser.downloads.download({
      url,
      filename,
      saveAs: false
    });
    
    // Update button to show success
    const btn = btnDownload.classList.contains('hidden') ? btnRedownload : btnDownload;
    const originalText = btn.textContent;
    btn.textContent = '✓ Downloaded!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  } catch (error) {
    console.error('[ChatGPT Backup] Download failed:', error);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

async function handleRedownload() {
  // Try to get last backup data from storage
  const stored = await browser.storage.local.get(['lastBackupData']);
  if (stored.lastBackupData) {
    await handleDownload(stored.lastBackupData);
  } else {
    alert('Previous backup data not available. Please run a new backup.');
  }
}

function convertToMarkdown(conversations: Conversation[]): string {
  let md = '# ChatGPT Backup\n\n';
  md += `Generated: ${new Date().toLocaleString()}\n\n`;
  md += `Total conversations: ${conversations.length}\n\n`;
  md += '---\n\n';
  
  for (const conv of conversations) {
    const date = conv.create_time ? new Date(conv.create_time * 1000).toLocaleString() : 'Unknown';
    md += `## ${conv.title || 'Untitled'}\n\n`;
    md += `*Date: ${date}*\n\n`;
    
    for (const msg of conv.messages) {
      const role = msg.role === 'user' ? '**User**' : `**Assistant** (${msg.model})`;
      md += `${role}:\n\n`;
      md += `${msg.content}\n\n`;
    }
    
    md += '---\n\n';
  }
  
  return md;
}

function convertToHTML(conversations: Conversation[]): string {
  const styles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
      h1 { color: #10a37f; }
      .conversation { border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0; padding: 16px; }
      .conv-title { margin: 0 0 8px 0; font-size: 18px; }
      .conv-date { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
      .message { margin: 12px 0; padding: 12px; border-radius: 8px; }
      .user { background: #f3f4f6; }
      .assistant { background: #ecfdf5; }
      .role { font-weight: 600; font-size: 12px; margin-bottom: 4px; }
      .content { white-space: pre-wrap; }
      pre { background: #1f2937; color: #f9fafb; padding: 12px; border-radius: 4px; overflow-x: auto; }
      code { font-family: monospace; }
    </style>
  `;
  
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ChatGPT Backup</title>${styles}</head><body>`;
  html += '<h1>ChatGPT Backup</h1>';
  html += `<p>Generated: ${new Date().toLocaleString()}</p>`;
  html += `<p>Total conversations: ${conversations.length}</p>`;
  
  for (const conv of conversations) {
    const date = conv.create_time ? new Date(conv.create_time * 1000).toLocaleString() : 'Unknown';
    html += '<div class="conversation">';
    html += `<h2 class="conv-title">${escapeHtml(conv.title || 'Untitled')}</h2>`;
    html += `<div class="conv-date">${date}</div>`;
    
    for (const msg of conv.messages) {
      const roleClass = msg.role === 'user' ? 'user' : 'assistant';
      const roleLabel = msg.role === 'user' ? 'User' : `Assistant (${msg.model})`;
      html += `<div class="message ${roleClass}">`;
      html += `<div class="role">${roleLabel}</div>`;
      html += `<div class="content">${formatContent(msg.content)}</div>`;
      html += '</div>';
    }
    
    html += '</div>';
  }
  
  html += '</body></html>';
  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatContent(content: string): string {
  // Convert code blocks
  content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  // Convert inline code
  content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Convert line breaks
  content = content.replace(/\n/g, '<br>');
  return content;
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

async function checkArchiveStatus() {
  try {
    const initialized = await isArchiveInitialized();
    if (!initialized) {
      // Show PIN setup guidance
      const statusSection = document.getElementById('status-section');
      if (statusSection) {
        const pinNotice = document.createElement('div');
        pinNotice.className = 'pin-notice';
        pinNotice.innerHTML = `
          <div class="pin-notice-content">
            <strong>🔐 First time?</strong> Click "Open Archive" to set up your PIN.
          </div>
        `;
        statusSection.appendChild(pinNotice);
      }
    }
  } catch (error) {
    console.error('[ChatGPT Backup Popup] Error checking archive status:', error);
  }
}

// Run init
init().catch(console.error);
