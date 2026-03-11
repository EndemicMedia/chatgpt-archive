/**
 * ChatGPT Archive Viewer App
 * 
 * A powerful analysis tool for ChatGPT conversation history
 * Integrates the analysis engine with a modern UI
 */

import { Conversation } from '@/utils/types';
import {
  isArchiveInitialized,
  initializeArchive,
  unlockArchive,
  getConversations,
  lockArchive
} from '@/utils/storage';
import {
  cleanContent,
  listConversations,
  peekConversation,
  getDialogue,
  getTableOfContents,
  getTimeline,
  searchConversations,
  rankedSearch,
  regexSearch,
  searchByRole,
  findWithFiles,
  findLongConversations,
  searchByDateRange,
  getStats,
  getTurnStats,
  getMonthlyHeatmap,
  getHourlyClock,
  getTopTopics,
  getModelUsage,
  scanPII,
  extractCodeBlocks,
  extractURLs,
  exportToHTML,
  exportManifestCSV
} from './analysis-engine';

// State management
interface ViewerState {
  conversations: Conversation[];
  filteredConversations: Conversation[];
  selectedConversation: Conversation | null;
  selectedIndex: number;
  searchQuery: string;
  viewMode: 'list' | 'detail' | 'analysis' | 'search';
  analysisTab: 'overview' | 'heatmap' | 'topics' | 'models' | 'pii';
  isUnlocked: boolean;
  isInitialized: boolean;
  setupPin: string;
}

const state: ViewerState = {
  conversations: [],
  filteredConversations: [],
  selectedConversation: null,
  selectedIndex: -1,
  searchQuery: '',
  viewMode: 'list',
  analysisTab: 'overview',
  isUnlocked: false,
  isInitialized: false,
  setupPin: ''
};

// DOM Elements cache
const elements: { [key: string]: HTMLElement | null } = {};

/**
 * Initialize the viewer app
 */
export async function initViewerApp() {
  console.log('[ChatGPT Archive Viewer] Initializing...');
  
  // Cache DOM elements
  elements.pinSetupScreen = document.getElementById('pin-setup-screen');
  elements.pinConfirmScreen = document.getElementById('pin-confirm-screen');
  elements.pinUnlockScreen = document.getElementById('pin-unlock-screen');
  elements.app = document.getElementById('app');
  elements.conversationList = document.getElementById('conversation-list');
  elements.searchInput = document.getElementById('search-input') as HTMLInputElement;
  elements.detailView = document.getElementById('detail-view');
  elements.analysisView = document.getElementById('analysis-view');
  elements.statsContainer = document.getElementById('stats-container');
  
  // Check if archive is initialized
  try {
    state.isInitialized = await isArchiveInitialized();
    console.log('[ChatGPT Archive Viewer] Archive initialized:', state.isInitialized);
    
    if (!state.isInitialized) {
      // Show PIN setup for first-time users
      showPinSetup();
    } else {
      // Show PIN unlock for returning users
      showPinUnlock();
    }
    
    // Setup PIN handlers
    setupPinHandlers();
    
    // Setup search
    setupSearch();
    
    // Setup navigation
    setupNavigation();
    
  } catch (error) {
    console.error('[ChatGPT Archive Viewer] Initialization error:', error);
    showPinSetup();
  }
}

/**
 * Show PIN setup screen (first-time user)
 */
function showPinSetup() {
  elements.pinSetupScreen?.classList.remove('hidden');
  elements.pinConfirmScreen?.classList.add('hidden');
  elements.pinUnlockScreen?.classList.add('hidden');
  elements.app?.classList.add('hidden');
  state.setupPin = '';
  updatePinDisplay('setup', '');
}

/**
 * Show PIN confirm screen
 */
function showPinConfirm() {
  elements.pinSetupScreen?.classList.add('hidden');
  elements.pinConfirmScreen?.classList.remove('hidden');
  elements.pinUnlockScreen?.classList.add('hidden');
  elements.app?.classList.add('hidden');
  updatePinDisplay('confirm', '');
}

/**
 * Show PIN unlock screen (returning user)
 */
function showPinUnlock() {
  elements.pinSetupScreen?.classList.add('hidden');
  elements.pinConfirmScreen?.classList.add('hidden');
  elements.pinUnlockScreen?.classList.remove('hidden');
  elements.app?.classList.add('hidden');
  updatePinDisplay('unlock', '');
}

/**
 * Show main app
 */
function showApp() {
  elements.pinSetupScreen?.classList.add('hidden');
  elements.pinConfirmScreen?.classList.add('hidden');
  elements.pinUnlockScreen?.classList.add('hidden');
  elements.app?.classList.remove('hidden');
  state.isUnlocked = true;
  loadConversations();
}

/**
 * Setup PIN keypad handlers
 */
function setupPinHandlers() {
  const keys = document.querySelectorAll('.pin-key');
  
  keys.forEach(key => {
    key.addEventListener('click', () => {
      const keyValue = key.getAttribute('data-key');
      const screen = key.getAttribute('data-screen');
      
      handlePinKey(keyValue, screen);
    });
  });
  
  // Back button for confirm screen
  const backBtn = document.getElementById('btn-back-to-setup');
  backBtn?.addEventListener('click', () => {
    state.setupPin = '';
    showPinSetup();
  });
}

// PIN entry state
const pinEntry = {
  setup: '',
  confirm: '',
  unlock: ''
};

/**
 * Handle PIN key press
 */
function handlePinKey(keyValue: string | null, screen: string | null) {
  if (!screen) return;
  
  const screenKey = screen as keyof typeof pinEntry;
  
  if (keyValue === 'clear') {
    pinEntry[screenKey] = '';
    updatePinDisplay(screen, '');
    clearError(screen);
  } else if (keyValue === 'enter') {
    handlePinSubmit(screen);
  } else if (keyValue && pinEntry[screenKey].length < 4) {
    pinEntry[screenKey] += keyValue;
    updatePinDisplay(screen, pinEntry[screenKey]);
    
    // Auto-submit when 4 digits entered
    if (pinEntry[screenKey].length === 4) {
      setTimeout(() => handlePinSubmit(screen), 200);
    }
  }
}

/**
 * Update PIN dot display
 */
function updatePinDisplay(screen: string, pin: string) {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`${screen}-dot-${i}`);
    if (dot) {
      dot.classList.toggle('filled', i <= pin.length);
    }
  }
}

/**
 * Clear error message
 */
function clearError(screen: string) {
  const errorEl = document.getElementById(`${screen}-pin-error`);
  if (errorEl) errorEl.textContent = '';
}

/**
 * Show error message
 */
function showError(screen: string, message: string) {
  const errorEl = document.getElementById(`${screen}-pin-error`);
  if (errorEl) errorEl.textContent = message;
}

/**
 * Handle PIN submission
 */
async function handlePinSubmit(screen: string) {
  const pin = pinEntry[screen as keyof typeof pinEntry];
  
  if (pin.length !== 4) {
    showError(screen, 'Please enter 4 digits');
    return;
  }
  
  if (screen === 'setup') {
    // Store PIN and go to confirm
    state.setupPin = pin;
    pinEntry.setup = '';
    pinEntry.confirm = '';
    showPinConfirm();
  } else if (screen === 'confirm') {
    // Check if PINs match
    if (pin === state.setupPin) {
      // Initialize archive with PIN
      try {
        await initializeArchive(pin);
        console.log('[ChatGPT Archive Viewer] Archive initialized');
        pinEntry.confirm = '';
        showApp();
      } catch (error) {
        console.error('[ChatGPT Archive Viewer] Failed to initialize:', error);
        showError('confirm', 'Failed to set up. Please try again.');
      }
    } else {
      showError('confirm', 'PINs do not match. Please try again.');
      pinEntry.confirm = '';
      updatePinDisplay('confirm', '');
    }
  } else if (screen === 'unlock') {
    // Verify PIN against stored hash
    try {
      const isValid = await unlockArchive(pin);
      if (isValid) {
        console.log('[ChatGPT Archive Viewer] PIN verified');
        pinEntry.unlock = '';
        showApp();
      } else {
        showError('unlock', 'Incorrect PIN. Please try again.');
        pinEntry.unlock = '';
        updatePinDisplay('unlock', '');
      }
    } catch (error) {
      console.error('[ChatGPT Archive Viewer] PIN verification error:', error);
      showError('unlock', 'Error verifying PIN. Please try again.');
    }
  }
}

/**
 * Load conversations from storage
 */
async function loadConversations() {
  try {
    console.log('[ChatGPT Archive Viewer] Loading conversations...');
    state.conversations = await getConversations();
    state.filteredConversations = [...state.conversations];
    renderConversationList();
    updateStats();
    
    if (state.conversations.length === 0) {
      showEmptyState();
    }
  } catch (error) {
    console.error('[ChatGPT Archive Viewer] Failed to load conversations:', error);
    // If decryption fails, lock and show unlock screen
    lockArchive();
    showPinUnlock();
    showError('unlock', 'Failed to decrypt data. Please enter PIN again.');
  }
}

/**
 * Show empty state when no conversations
 */
function showEmptyState() {
  if (elements.conversationList) {
    elements.conversationList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No Conversations Yet</h3>
        <p>Go to chatgpt.com and click "New Backup" to save your conversations.</p>
      </div>
    `;
  }
}

/**
 * Setup search functionality
 */
function setupSearch() {
  elements.searchInput?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value;
    state.searchQuery = query;
    
    if (query.length > 2) {
      performSearch(query);
    } else {
      state.filteredConversations = [...state.conversations];
      renderConversationList();
    }
  });
}

function performSearch(query: string) {
  const results = rankedSearch(state.conversations, query, 50);
  state.filteredConversations = results.map(r => r.conversation);
  renderConversationList(results.map(r => ({ ...r, index: r.index })));
}

/**
 * Setup navigation
 */
function setupNavigation() {
  // Advanced search button
  const btnAdvanced = document.getElementById('btn-advanced-search');
  btnAdvanced?.addEventListener('click', showAdvancedSearch);
  
  // Analytics button
  const btnAnalytics = document.getElementById('btn-global-analysis');
  btnAnalytics?.addEventListener('click', showAnalytics);
  
  // Export CSV button
  const btnExport = document.getElementById('btn-export-csv');
  btnExport?.addEventListener('click', exportToCSV);
}

function showAdvancedSearch() {
  // TODO: Implement advanced search UI
  alert('Advanced search coming soon!');
}

function showAnalytics() {
  // TODO: Implement analytics view
  alert('Analytics coming soon!');
}

function exportToCSV() {
  if (state.conversations.length === 0) {
    alert('No conversations to export');
    return;
  }
  
  const csv = exportManifestCSV(state.conversations);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chatgpt-archive-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Render conversation list
 */
function renderConversationList(searchResults?: Array<{ index: number; title: string; score?: number }>) {
  if (!elements.conversationList) return;
  
  const items = searchResults || state.filteredConversations.map((c, i) => ({ index: i, title: c.title }));
  
  if (items.length === 0) {
    elements.conversationList.innerHTML = '<div class="no-results">No conversations found</div>';
    return;
  }
  
  elements.conversationList.innerHTML = items.map(item => {
    const conv = state.conversations[item.index];
    const date = new Date(conv.create_time).toLocaleDateString();
    const msgCount = conv.messages?.length || 0;
    const score = 'score' in item ? `<span class="search-score">Score: ${item.score}</span>` : '';
    
    return `
      <div class="conversation-item" data-index="${item.index}">
        <div class="conv-header">
          <h3>${escapeHtml(conv.title)}</h3>
          ${score}
        </div>
        <div class="conv-meta">
          <span>📅 ${date}</span>
          <span>💬 ${msgCount} messages</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  elements.conversationList.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.getAttribute('data-index') || '0');
      selectConversation(index);
    });
  });
}

function selectConversation(index: number) {
  state.selectedIndex = index;
  state.selectedConversation = state.conversations[index];
  renderDetailView();
}

function renderDetailView() {
  const conv = state.selectedConversation;
  if (!conv || !elements.detailView) return;
  
  document.getElementById('empty-state')?.classList.add('hidden');
  elements.detailView.classList.remove('hidden');
  
  const date = new Date(conv.create_time).toLocaleString();
  
  elements.detailView.innerHTML = `
    <div class="detail-header">
      <h2>${escapeHtml(conv.title)}</h2>
      <div class="detail-meta">
        <span>📅 ${date}</span>
        <span>💬 ${conv.messages?.length || 0} messages</span>
      </div>
    </div>
    <div class="detail-messages">
      ${(conv.messages || []).map(msg => `
        <div class="message ${msg.role}">
          <div class="message-role">${msg.role === 'user' ? '👤 User' : '🤖 Assistant'}</div>
          <div class="message-content">${formatContent(msg.content)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function formatContent(content: string): string {
  return escapeHtml(content)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateStats() {
  if (!elements.statsContainer) return;
  
  const total = state.conversations.length;
  const totalMessages = state.conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0);
  
  elements.statsContainer.innerHTML = `
    <span>📚 ${total} conversations</span>
    <span>💬 ${totalMessages} messages</span>
  `;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initViewerApp().catch(console.error);
});
