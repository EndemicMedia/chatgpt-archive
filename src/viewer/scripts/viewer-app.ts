/**
 * ChatGPT Archive Viewer App
 * 
 * A powerful analysis tool for ChatGPT conversation history
 * Integrates the analysis engine with a modern UI
 */

import { Conversation } from '@/utils/types';
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
}

const state: ViewerState = {
  conversations: [],
  filteredConversations: [],
  selectedConversation: null,
  selectedIndex: -1,
  searchQuery: '',
  viewMode: 'list',
  analysisTab: 'overview',
  isUnlocked: false
};

// DOM Elements cache
const elements: { [key: string]: HTMLElement | null } = {};

/**
 * Initialize the viewer app
 */
export function initViewerApp() {
  // Cache DOM elements
  elements.pinScreen = document.getElementById('pin-screen');
  elements.app = document.getElementById('app');
  elements.conversationList = document.getElementById('conversation-list');
  elements.searchInput = document.getElementById('search-input') as HTMLInputElement;
  elements.detailView = document.getElementById('detail-view');
  elements.analysisView = document.getElementById('analysis-view');
  elements.statsContainer = document.getElementById('stats-container');
  
  // Setup PIN screen
  setupPinScreen();
  
  // Setup search
  setupSearch();
  
  // Setup navigation
  setupNavigation();
  
  // Load conversations from storage
  loadConversations();
}

/**
 * Setup PIN screen handlers
 */
function setupPinScreen() {
  const pinKeys = document.querySelectorAll('.pin-key');
  let currentPin = '';
  
  pinKeys.forEach(key => {
    key.addEventListener('click', () => {
      const keyValue = key.getAttribute('data-key');
      
      if (keyValue === 'clear') {
        currentPin = '';
        updatePinDisplay(currentPin);
      } else if (keyValue === 'enter') {
        verifyPin(currentPin);
      } else {
        if (currentPin.length < 4) {
          currentPin += keyValue;
          updatePinDisplay(currentPin);
        }
      }
    });
  });
}

function updatePinDisplay(pin: string) {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < pin.length);
  });
}

async function verifyPin(pin: string) {
  // In production, this would verify against stored hash
  // For demo, using simple PIN
  if (pin === '1234') {
    state.isUnlocked = true;
    elements.pinScreen?.classList.add('hidden');
    elements.app?.classList.remove('hidden');
    await loadConversations();
  } else {
    const error = document.getElementById('pin-error');
    if (error) error.textContent = 'Incorrect PIN';
    updatePinDisplay('');
  }
}

/**
 * Load conversations from storage
 */
async function loadConversations() {
  try {
    // In production, load from encrypted storage
    // For demo, check if there's data in storage
    const result = await browser.storage.local.get('lastBackupData');
    if (result.lastBackupData) {
      state.conversations = result.lastBackupData;
      state.filteredConversations = [...state.conversations];
      renderConversationList();
      updateStats();
    }
  } catch (error) {
    console.error('Failed to load conversations:', error);
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
 * Render conversation list
 */
function renderConversationList(searchResults?: Array<{ index: number; title: string; score?: number }>) {
  if (!elements.conversationList) return;
  
  const items = searchResults || state.filteredConversations.map((c, i) => ({ index: i, title: c.title }));
  
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
      const index = parseInt(item.getAttribute('data-index') || '-1');
      selectConversation(index);
    });
  });
}

/**
 * Select a conversation to view
 */
function selectConversation(index: number) {
  state.selectedIndex = index;
  state.selectedConversation = state.conversations[index];
  state.viewMode = 'detail';
  
  renderDetailView();
  updateActiveItem();
}

function updateActiveItem() {
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.toggle('active', parseInt(item.getAttribute('data-index') || '-1') === state.selectedIndex);
  });
}

/**
 * Render detail view
 */
function renderDetailView() {
  if (!state.selectedConversation || !elements.detailView) return;
  
  const conv = state.selectedConversation;
  const peek = peekConversation(conv);
  const dialogue = getDialogue(conv);
  const toc = getTableOfContents(conv);
  
  elements.detailView.innerHTML = `
    <div class="detail-header">
      <h2>${escapeHtml(conv.title)}</h2>
      <div class="detail-actions">
        <button id="btn-analysis">📊 Analysis</button>
        <button id="btn-export-html">📄 Export HTML</button>
        <button id="btn-close-detail">✕</button>
      </div>
    </div>
    
    <div class="detail-meta">
      <span>📅 ${new Date(conv.create_time).toLocaleString()}</span>
      <span>💬 ${peek.messageCount} messages</span>
      <span>🔤 ~${peek.estimatedTokens} tokens</span>
    </div>
    
    <div class="detail-tabs">
      <button class="tab-btn active" data-tab="dialogue">Dialogue</button>
      <button class="tab-btn" data-tab="toc">Contents</button>
      <button class="tab-btn" data-tab="stats">Stats</button>
      <button class="tab-btn" data-tab="code">Code</button>
      <button class="tab-btn" data-tab="urls">URLs</button>
    </div>
    
    <div class="detail-content">
      <div id="tab-dialogue" class="tab-panel active">
        ${dialogue.map(d => `
          <div class="message ${d.role}">
            <div class="message-header">${d.role === 'user' ? '👤 You' : '🤖 Assistant'} (Turn ${d.turn})</div>
            <div class="message-body">${formatMessageContent(d.content)}</div>
          </div>
        `).join('')}
      </div>
      
      <div id="tab-toc" class="tab-panel">
        <h4>Table of Contents</h4>
        ${toc.map(t => `
          <div class="toc-item" data-turn="${t.turn}">
            <span class="toc-turn">Turn ${t.turn}</span>
            <span class="toc-preview">${escapeHtml(t.preview)}</span>
          </div>
        `).join('')}
      </div>
      
      <div id="tab-stats" class="tab-panel">
        <h4>Turn-by-Turn Statistics</h4>
        <table class="stats-table">
          <tr><th>Turn</th><th>Role</th><th>Words</th><th>Chars</th></tr>
          ${getTurnStats(conv).map(s => `
            <tr><td>${s.turn}</td><td>${s.role}</td><td>${s.words}</td><td>${s.chars}</td></tr>
          `).join('')}
        </table>
      </div>
      
      <div id="tab-code" class="tab-panel">
        <h4>Extracted Code Blocks</h4>
        ${extractCodeBlocks(conv).map((code, i) => `
          <div class="code-block">
            <div class="code-header">Block ${i + 1}</div>
            <pre><code>${escapeHtml(code)}</code></pre>
          </div>
        `).join('') || '<p>No code blocks found</p>'}
      </div>
      
      <div id="tab-urls" class="tab-panel">
        <h4>Extracted URLs</h4>
        ${extractURLs(conv).map(url => `
          <a href="${url}" target="_blank" class="url-link">${url}</a>
        `).join('') || '<p>No URLs found</p>'}
      </div>
    </div>
  `;
  
  // Setup tab handlers
  elements.detailView.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab || 'dialogue');
    });
  });
  
  // Setup action handlers
  document.getElementById('btn-analysis')?.addEventListener('click', showAnalysis);
  document.getElementById('btn-export-html')?.addEventListener('click', () => exportConversationHTML(conv));
  document.getElementById('btn-close-detail')?.addEventListener('click', () => {
    state.viewMode = 'list';
    elements.detailView?.classList.add('hidden');
  });
  
  elements.detailView.classList.remove('hidden');
}

function switchTab(tab: string) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
}

/**
 * Show analysis view
 */
function showAnalysis() {
  state.viewMode = 'analysis';
  renderAnalysisView();
}

function renderAnalysisView() {
  if (!elements.analysisView) return;
  
  const stats = getStats(state.conversations);
  
  elements.analysisView.innerHTML = `
    <div class="analysis-header">
      <h2>📊 Archive Analytics</h2>
      <button id="btn-close-analysis">✕</button>
    </div>
    
    <div class="analysis-tabs">
      <button class="analysis-tab active" data-tab="overview">Overview</button>
      <button class="analysis-tab" data-tab="heatmap">Activity</button>
      <button class="analysis-tab" data-tab="topics">Topics</button>
      <button class="analysis-tab" data-tab="models">Models</button>
      <button class="analysis-tab" data-tab="pii">PII Scan</button>
    </div>
    
    <div class="analysis-content">
      <div id="analysis-overview" class="analysis-panel active">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.totalChats}</div>
            <div class="stat-label">Total Chats</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalMessages}</div>
            <div class="stat-label">Messages</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalWords.toLocaleString()}</div>
            <div class="stat-label">Words</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.averageMessagesPerChat}</div>
            <div class="stat-label">Avg Msgs/Chat</div>
          </div>
        </div>
        <div class="date-range">
          📅 ${stats.dateRange.start} → ${stats.dateRange.end}
        </div>
      </div>
      
      <div id="analysis-heatmap" class="analysis-panel">
        <h4>Monthly Activity</h4>
        <div class="heatmap">
          ${Object.entries(getMonthlyHeatmap(state.conversations)).map(([month, count]) => `
            <div class="heatmap-row">
              <span class="heatmap-label">${month}</span>
              <div class="heatmap-bar" style="width: ${Math.min(count * 10, 300)}px; background: ${getHeatColor(count)}"></div>
              <span class="heatmap-count">${count}</span>
            </div>
          `).join('')}
        </div>
        
        <h4>Hourly Activity (24h Clock)</h4>
        <div class="clock-chart">
          ${getHourlyClock(state.conversations).map((count, hour) => `
            <div class="clock-bar" style="height: ${Math.max(count * 2, 5)}px;" title="${hour}:00 - ${count} chats"></div>
          `).join('')}
        </div>
        <div class="clock-labels">
          ${[0, 6, 12, 18].map(h => `<span>${h}:00</span>`).join('')}
        </div>
      </div>
      
      <div id="analysis-topics" class="analysis-panel">
        <h4>Top Topics (from titles)</h4>
        <div class="topics-list">
          ${getTopTopics(state.conversations, 20).map((t, i) => `
            <div class="topic-item">
              <span class="topic-rank">${i + 1}</span>
              <span class="topic-word">${t.word}</span>
              <div class="topic-bar" style="width: ${t.count * 5}px"></div>
              <span class="topic-count">${t.count}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div id="analysis-models" class="analysis-panel">
        <h4>Model Usage</h4>
        <div class="models-list">
          ${getModelUsage(state.conversations).map(m => `
            <div class="model-item">
              <span class="model-name">${m.model}</span>
              <div class="model-bar" style="width: ${Math.min(m.count, 200)}px"></div>
              <span class="model-count">${m.count} msgs</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div id="analysis-pii" class="analysis-panel">
        <h4>PII Security Scan</h4>
        <p>Scanning all conversations for emails, IPs, phone numbers, and API keys...</p>
        <button id="btn-run-pii-scan" class="btn-primary">Run Full Scan</button>
        <div id="pii-results"></div>
      </div>
    </div>
  `;
  
  // Setup handlers
  document.getElementById('btn-close-analysis')?.addEventListener('click', () => {
    elements.analysisView?.classList.add('hidden');
  });
  
  document.getElementById('btn-run-pii-scan')?.addEventListener('click', runPIIScan);
  
  elements.analysisView.querySelectorAll('.analysis-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      switchAnalysisTab(tabName || 'overview');
    });
  });
  
  elements.analysisView.classList.remove('hidden');
}

function switchAnalysisTab(tab: string) {
  document.querySelectorAll('.analysis-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tab));
  document.querySelectorAll('.analysis-panel').forEach(p => p.classList.toggle('active', p.id === `analysis-${tab}`));
}

async function runPIIScan() {
  const resultsDiv = document.getElementById('pii-results');
  if (!resultsDiv) return;
  
  resultsDiv.innerHTML = '<p>Scanning...</p>';
  
  const allFindings: Array<{ convIndex: number; title: string; findings: ReturnType<typeof scanPII> }> = [];
  
  state.conversations.forEach((conv, i) => {
    const findings = scanPII(conv);
    if (findings.length > 0) {
      allFindings.push({ convIndex: i, title: conv.title, findings });
    }
  });
  
  if (allFindings.length === 0) {
    resultsDiv.innerHTML = '<p class="pii-safe">✅ No PII detected in any conversation</p>';
  } else {
    resultsDiv.innerHTML = `
      <p class="pii-warning">⚠️ Found PII in ${allFindings.length} conversations:</p>
      ${allFindings.map(f => `
        <div class="pii-conv">
          <h5>${escapeHtml(f.title)}</h5>
          ${f.findings.map(finding => `
            <div class="pii-finding">
              <span class="pii-type">${finding.type}</span>
              <span class="pii-turn">Turn ${finding.turn}</span>
              <span class="pii-matches">${finding.matches.length} matches</span>
            </div>
          `).join('')}
        </div>
      `).join('')}
    `;
  }
}

/**
 * Update global stats display
 */
function updateStats() {
  if (!elements.statsContainer || state.conversations.length === 0) return;
  
  const stats = getStats(state.conversations);
  elements.statsContainer.innerHTML = `
    <span>📊 ${stats.totalChats} chats</span>
    <span>💬 ${stats.totalMessages} msgs</span>
    <span>🔤 ${stats.totalWords.toLocaleString()} words</span>
  `;
}

/**
 * Export conversation to HTML
 */
function exportConversationHTML(conv: Conversation) {
  const html = exportToHTML(conv);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${conv.title.replace(/[^a-z0-9]/gi, '_')}.html`;
  a.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Setup navigation handlers
 */
function setupNavigation() {
  // Advanced search button
  document.getElementById('btn-advanced-search')?.addEventListener('click', showAdvancedSearch);
  
  // Analysis button
  document.getElementById('btn-global-analysis')?.addEventListener('click', showAnalysis);
  
  // Export CSV button
  document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);
}

function showAdvancedSearch() {
  // Implement advanced search modal with regex, date range, role filters
  alert('Advanced Search: Use regex patterns like /code|script/i or date ranges YYYY-MM-DD to YYYY-MM-DD');
}

function exportCSV() {
  const csv = exportManifestCSV(state.conversations);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `chatgpt-archive-manifest-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// Utility functions
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMessageContent(content: string): string {
  // Format code blocks
  let formatted = escapeHtml(content);
  formatted = formatted.replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

function getHeatColor(count: number): string {
  if (count < 5) return '#e3f2fd';
  if (count < 15) return '#90caf9';
  if (count < 30) return '#42a5f5';
  if (count < 50) return '#1e88e5';
  return '#1565c0';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initViewerApp);
