/**
 * ChatGPT Archive Viewer App
 */

import { Conversation } from '@/utils/types';
import {
  isArchiveInitialized,
  initializeArchive,
  unlockArchive,
  getConversations,
  lockArchive,
  hasArchiveData,
  isArchiveUnlocked,
  saveConversations,
  changePIN
} from '@/utils/storage';
import {
  rankedSearch,
  getStats,
  getMonthlyHeatmap,
  getHourlyClock,
  getTopTopics,
  getModelUsage,
  exportManifestCSV,
  HeatmapData,
  TopicCount,
  ModelUsage
} from './analysis-engine';

// ========== TYPES ==========

interface ViewerState {
  conversations: Conversation[];
  filteredConversations: Conversation[];
  selectedConversation: Conversation | null;
  selectedIndex: number;
  searchQuery: string;
  isUnlocked: boolean;
  isInitialized: boolean;
  setupPin: string;
}

interface DisplaySettings {
  fontFamily: 'system' | 'serif' | 'mono';
  fontSize: number;
  lineHeight: number;
  darkMode: boolean;
}

// ========== STATE ==========

const state: ViewerState = {
  conversations: [],
  filteredConversations: [],
  selectedConversation: null,
  selectedIndex: -1,
  searchQuery: '',
  isUnlocked: false,
  isInitialized: false,
  setupPin: ''
};

let pendingImportConversations: Conversation[] | null = null;

const elements: { [key: string]: HTMLElement | null } = {};

// ========== DISPLAY SETTINGS ==========

const FONT_MAP: Record<string, string> = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  mono: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace"
};

const DEFAULT_SETTINGS: DisplaySettings = {
  fontFamily: 'system',
  fontSize: 15,
  lineHeight: 1.65,
  darkMode: false
};

let displaySettings: DisplaySettings = { ...DEFAULT_SETTINGS };

try {
  const saved = localStorage.getItem('archive-display-settings');
  if (saved) {
    displaySettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  }
} catch (_) {}

function applyDisplaySettings() {
  const root = document.documentElement;
  root.setAttribute('data-theme', displaySettings.darkMode ? 'dark' : '');
  root.style.setProperty('--content-font', FONT_MAP[displaySettings.fontFamily]);
  root.style.setProperty('--content-font-size', `${displaySettings.fontSize}px`);
  root.style.setProperty('--content-line-height', `${displaySettings.lineHeight}`);

  const darkBtn = document.getElementById('btn-dark-mode');
  if (darkBtn) darkBtn.textContent = displaySettings.darkMode ? '☀️' : '🌙';

  const fontSizeLabel = document.getElementById('font-size-label');
  if (fontSizeLabel) fontSizeLabel.textContent = `${displaySettings.fontSize}px`;

  const fontSelect = document.getElementById('setting-font') as HTMLSelectElement | null;
  if (fontSelect) fontSelect.value = displaySettings.fontFamily;

  const lineSelect = document.getElementById('setting-line-height') as HTMLSelectElement | null;
  if (lineSelect) lineSelect.value = String(displaySettings.lineHeight);

  try {
    localStorage.setItem('archive-display-settings', JSON.stringify(displaySettings));
  } catch (_) {}
}

function setupToolbar() {
  const fontSelect = document.getElementById('setting-font') as HTMLSelectElement | null;
  fontSelect?.addEventListener('change', () => {
    displaySettings.fontFamily = fontSelect.value as DisplaySettings['fontFamily'];
    applyDisplaySettings();
  });

  document.getElementById('btn-font-decrease')?.addEventListener('click', () => {
    displaySettings.fontSize = Math.max(11, displaySettings.fontSize - 1);
    applyDisplaySettings();
  });

  document.getElementById('btn-font-increase')?.addEventListener('click', () => {
    displaySettings.fontSize = Math.min(22, displaySettings.fontSize + 1);
    applyDisplaySettings();
  });

  const lineSelect = document.getElementById('setting-line-height') as HTMLSelectElement | null;
  lineSelect?.addEventListener('change', () => {
    displaySettings.lineHeight = parseFloat(lineSelect.value);
    applyDisplaySettings();
  });

  document.getElementById('btn-dark-mode')?.addEventListener('click', () => {
    displaySettings.darkMode = !displaySettings.darkMode;
    applyDisplaySettings();
  });
}

// ========== INIT ==========

export async function initViewerApp() {
  console.log('[ChatGPT Archive Viewer] Initializing...');

  elements.pinSetupScreen = document.getElementById('pin-setup-screen');
  elements.pinConfirmScreen = document.getElementById('pin-confirm-screen');
  elements.pinUnlockScreen = document.getElementById('pin-unlock-screen');
  elements.pinChangeScreen = document.getElementById('pin-change-screen');
  elements.app = document.getElementById('app');
  elements.conversationList = document.getElementById('conversation-list');
  elements.searchInput = document.getElementById('search-input');
  elements.detailView = document.getElementById('detail-view');
  elements.analysisView = document.getElementById('analysis-view');
  elements.statsContainer = document.getElementById('stats-container');

  applyDisplaySettings();
  setupToolbar();
  setupPinHandlers();
  setupSearch();
  setupNavigation();

  try {
    // Check for pending backup data from the popup's "New Backup" flow
    const stored = await browser.storage.local.get(['lastBackupData']);
    const backupData: Conversation[] | undefined = stored.lastBackupData;
    const hasPendingBackup = Array.isArray(backupData) && backupData.length > 0;

    if (hasPendingBackup) {
      pendingImportConversations = backupData!;
      console.log(`[ChatGPT Archive Viewer] Pending backup detected: ${backupData!.length} conversations`);
    }

    const initialized = await isArchiveInitialized();
    console.log(`[ChatGPT Archive Viewer] initialized=${initialized}, pendingBackup=${hasPendingBackup}`);

    if (!initialized) {
      // No archive set up yet
      if (hasPendingBackup) {
        // Force PIN setup before backup can be saved
        showPinSetup();
        const el = document.getElementById('setup-pin-error');
        if (el) el.textContent = `Create a PIN to save your ${backupData!.length} backed up conversations.`;
      } else {
        showApp();
        showEmptyState();
      }
    } else {
      // Archive is initialized — ALWAYS require PIN unlock (even if archive is empty)
      showPinUnlock();
      if (hasPendingBackup) {
        const el = document.getElementById('unlock-pin-error');
        if (el) el.textContent = `Enter your PIN to import ${backupData!.length} new conversations.`;
      }
    }
  } catch (error) {
    console.error('[ChatGPT Archive Viewer] Initialization error:', error);
    showApp();
    showEmptyState();
  }
}

// ========== PIN SCREENS ==========

function showPinSetup() {
  elements.pinSetupScreen?.classList.remove('hidden');
  elements.pinConfirmScreen?.classList.add('hidden');
  elements.pinUnlockScreen?.classList.add('hidden');
  elements.pinChangeScreen?.classList.add('hidden');
  elements.app?.classList.add('hidden');
  state.setupPin = '';
  pinEntry.setup = '';
  pinEntry.confirm = '';
  updatePinDisplay('setup', '');
}

function showPinConfirm() {
  elements.pinSetupScreen?.classList.add('hidden');
  elements.pinConfirmScreen?.classList.remove('hidden');
  elements.pinUnlockScreen?.classList.add('hidden');
  elements.pinChangeScreen?.classList.add('hidden');
  elements.app?.classList.add('hidden');
  pinEntry.confirm = '';
  updatePinDisplay('confirm', '');
}

function showPinUnlock() {
  elements.pinSetupScreen?.classList.add('hidden');
  elements.pinConfirmScreen?.classList.add('hidden');
  elements.pinUnlockScreen?.classList.remove('hidden');
  elements.pinChangeScreen?.classList.add('hidden');
  elements.app?.classList.add('hidden');
  pinEntry.unlock = '';
  updatePinDisplay('unlock', '');
}

// Change PIN flow state
const changePinFlow = { step: 'old' as 'old' | 'new' | 'confirm', oldPin: '', newPin: '' };

function showChangePinScreen() {
  changePinFlow.step = 'old';
  changePinFlow.oldPin = '';
  changePinFlow.newPin = '';
  pinEntry.change = '';

  const title = document.getElementById('change-pin-title');
  const subtitle = document.getElementById('change-pin-subtitle');
  if (title) title.textContent = 'Enter Current PIN';
  if (subtitle) subtitle.textContent = 'Step 1 of 3: Verify your current PIN';

  updatePinDisplay('change', '');
  clearError('change');

  elements.pinSetupScreen?.classList.add('hidden');
  elements.pinConfirmScreen?.classList.add('hidden');
  elements.pinUnlockScreen?.classList.add('hidden');
  elements.pinChangeScreen?.classList.remove('hidden');
  elements.app?.classList.add('hidden');
}

async function showApp() {
  elements.pinSetupScreen?.classList.add('hidden');
  elements.pinConfirmScreen?.classList.add('hidden');
  elements.pinUnlockScreen?.classList.add('hidden');
  elements.pinChangeScreen?.classList.add('hidden');
  elements.app?.classList.remove('hidden');
  state.isUnlocked = true;

  if (pendingImportConversations) {
    const pending = pendingImportConversations;
    pendingImportConversations = null;
    try {
      console.log(`[ChatGPT Archive] Importing ${pending.length} pending conversations...`);

      // If there's already data, merge with it (dedup by create_time+title)
      const existingConvs = state.conversations.length > 0 ? state.conversations : await (async () => {
        try { return await getConversations(); } catch { return []; }
      })();
      const existingKeys = new Set(existingConvs.map(c => `${c.create_time}|${c.title}`));
      const newOnes = pending.filter(c => !existingKeys.has(`${c.create_time}|${c.title}`));
      const merged = [...existingConvs, ...newOnes];

      await saveConversations(merged);
      // Clear temp backup storage now that it's safely in the encrypted archive
      await browser.storage.local.remove('lastBackupData');
      console.log('[ChatGPT Archive] Cleared lastBackupData from storage');

      state.conversations = merged;
      state.filteredConversations = [...merged];
      renderConversationList();
      populateModelFilter();
      updateStats();
      toast(`Imported ${newOnes.length} conversation${newOnes.length !== 1 ? 's' : ''} into archive.${existingConvs.length > 0 ? ` (${merged.length} total)` : ''}`, 'success');
    } catch (err) {
      console.error('[ChatGPT Archive] Pending import failed:', err);
      toast('Import failed after PIN setup: ' + (err instanceof Error ? err.message : String(err)), 'error', 6000);
      loadConversations();
    }
  } else {
    loadConversations();
  }
}

// ========== PIN HANDLERS ==========

const pinEntry: Record<string, string> = {
  setup: '',
  confirm: '',
  unlock: '',
  change: ''
};

function setupPinHandlers() {
  document.querySelectorAll('.pin-key').forEach(key => {
    key.addEventListener('click', () => {
      handlePinKey(key.getAttribute('data-key'), key.getAttribute('data-screen'));
    });
  });

  document.getElementById('btn-back-to-setup')?.addEventListener('click', () => {
    state.setupPin = '';
    showPinSetup();
  });

  document.getElementById('btn-cancel-change-pin')?.addEventListener('click', () => {
    showApp();
  });

  setupKeyboardSupport();
}

function setupKeyboardSupport() {
  document.addEventListener('keydown', (e) => {
    const visibleScreen = getVisiblePinScreen();
    if (!visibleScreen) return;
    const key = e.key;
    if (key >= '0' && key <= '9') {
      e.preventDefault();
      handlePinKey(key, visibleScreen);
    } else if (key === 'Enter') {
      e.preventDefault();
      handlePinKey('enter', visibleScreen);
    } else if (key === 'Escape' || key === 'Backspace') {
      e.preventDefault();
      handlePinKey('clear', visibleScreen);
    }
  });
}

function getVisiblePinScreen(): string | null {
  if (!elements.pinSetupScreen?.classList.contains('hidden')) return 'setup';
  if (!elements.pinConfirmScreen?.classList.contains('hidden')) return 'confirm';
  if (!elements.pinUnlockScreen?.classList.contains('hidden')) return 'unlock';
  if (!elements.pinChangeScreen?.classList.contains('hidden')) return 'change';
  return null;
}

function handlePinKey(keyValue: string | null, screen: string | null) {
  if (!screen || !(screen in pinEntry)) return;

  if (keyValue === 'clear') {
    pinEntry[screen] = '';
    updatePinDisplay(screen, '');
    clearError(screen);
  } else if (keyValue === 'enter') {
    handlePinSubmit(screen);
  } else if (keyValue && pinEntry[screen].length < 6) {
    pinEntry[screen] += keyValue;
    updatePinDisplay(screen, pinEntry[screen]);
    if (pinEntry[screen].length === 6) {
      setTimeout(() => handlePinSubmit(screen), 200);
    }
  }
}

function updatePinDisplay(screen: string, pin: string) {
  for (let i = 1; i <= 6; i++) {
    const dot = document.getElementById(`${screen}-dot-${i}`);
    dot?.classList.toggle('filled', i <= pin.length);
  }
}

function clearError(screen: string) {
  const el = document.getElementById(`${screen}-pin-error`);
  if (el) el.textContent = '';
}

function showError(screen: string, message: string) {
  const el = document.getElementById(`${screen}-pin-error`);
  if (el) el.textContent = message;
}

async function handlePinSubmit(screen: string) {
  const pin = pinEntry[screen];

  if (pin.length < 4) {
    showError(screen, 'Please enter 4-6 digits');
    return;
  }

  if (screen === 'setup') {
    state.setupPin = pin;
    pinEntry.setup = '';
    pinEntry.confirm = '';
    showPinConfirm();

  } else if (screen === 'confirm') {
    if (pin === state.setupPin) {
      try {
        await initializeArchive(pin);
        pinEntry.confirm = '';
        showApp();
      } catch (error) {
        showError('confirm', 'Failed to set up. Please try again.');
      }
    } else {
      showError('confirm', 'PINs do not match. Please try again.');
      pinEntry.confirm = '';
      updatePinDisplay('confirm', '');
    }

  } else if (screen === 'unlock') {
    try {
      const isValid = await unlockArchive(pin);
      if (isValid) {
        pinEntry.unlock = '';
        showApp();
      } else {
        showError('unlock', 'Incorrect PIN. Please try again.');
        pinEntry.unlock = '';
        updatePinDisplay('unlock', '');
      }
    } catch (error) {
      showError('unlock', 'Error verifying PIN. Please try again.');
    }

  } else if (screen === 'change') {
    await handleChangePinStep(pin);
    pinEntry.change = '';
    updatePinDisplay('change', '');
  }
}

async function handleChangePinStep(pin: string) {
  const title = document.getElementById('change-pin-title');
  const subtitle = document.getElementById('change-pin-subtitle');

  if (changePinFlow.step === 'old') {
    // Verify old PIN
    try {
      const isValid = await unlockArchive(pin);
      if (isValid) {
        changePinFlow.oldPin = pin;
        changePinFlow.step = 'new';
        if (title) title.textContent = 'Enter New PIN';
        if (subtitle) subtitle.textContent = 'Step 2 of 3: Choose your new PIN';
        clearError('change');
      } else {
        showError('change', 'Incorrect PIN. Please try again.');
      }
    } catch (_) {
      showError('change', 'Error verifying PIN. Please try again.');
    }

  } else if (changePinFlow.step === 'new') {
    changePinFlow.newPin = pin;
    changePinFlow.step = 'confirm';
    if (title) title.textContent = 'Confirm New PIN';
    if (subtitle) subtitle.textContent = 'Step 3 of 3: Re-enter your new PIN';
    clearError('change');

  } else if (changePinFlow.step === 'confirm') {
    if (pin !== changePinFlow.newPin) {
      showError('change', 'PINs do not match. Please try again.');
      changePinFlow.step = 'new';
      if (title) title.textContent = 'Enter New PIN';
      if (subtitle) subtitle.textContent = 'Step 2 of 3: Choose your new PIN';
      return;
    }
    try {
      const ok = await changePIN(changePinFlow.oldPin, pin);
      if (ok) {
        clearError('change');
        showApp();
        toast('PIN changed successfully.', 'success');
      } else {
        showError('change', 'Failed to change PIN. Please try again.');
        changePinFlow.step = 'old';
        if (title) title.textContent = 'Enter Current PIN';
        if (subtitle) subtitle.textContent = 'Step 1 of 3: Verify your current PIN';
      }
    } catch (_) {
      showError('change', 'Error changing PIN. Please try again.');
    }
  }
}

// ========== CONVERSATIONS ==========

async function loadConversations() {
  try {
    state.conversations = await getConversations();
    state.filteredConversations = [...state.conversations];
    renderConversationList();
    populateModelFilter();
    updateStats();
    if (state.conversations.length === 0) showEmptyState();
  } catch (error) {
    console.error('[ChatGPT Archive Viewer] Failed to load:', error);
    lockArchive();
    showPinUnlock();
    showError('unlock', 'Failed to decrypt data. Please enter PIN again.');
  }
}

function showEmptyState() {
  if (elements.conversationList) {
    elements.conversationList.innerHTML = `
      <div class="empty-state" style="padding:2rem 1rem;">
        <div class="empty-state-icon">📭</div>
        <h3>No Conversations Yet</h3>
        <p>Your archive is empty. To get started:</p>
        <ol class="empty-state-steps">
          <li>Go to <strong>chatgpt.com</strong></li>
          <li>Click the extension icon → <strong>"New Backup"</strong></li>
          <li>Or use <strong>Import JSON</strong> above</li>
        </ol>
        <p class="empty-state-note">🔒 A PIN will be set up to protect your data</p>
      </div>
    `;
  }
}

// ========== SEARCH ==========

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
  renderConversationList(results.map(r => ({ index: r.index, title: r.title, score: r.score })));
}

// ========== NAVIGATION ==========

function setupNavigation() {
  document.getElementById('btn-advanced-search')?.addEventListener('click', showAdvancedSearch);
  document.getElementById('btn-global-analysis')?.addEventListener('click', showAnalytics);
  setupAdvancedSearch();
  document.getElementById('btn-export-csv')?.addEventListener('click', exportToCSV);
  document.getElementById('btn-export-json')?.addEventListener('click', exportToJSON);
  document.getElementById('btn-change-pin')?.addEventListener('click', showChangePinScreen);

  const btnImport = document.getElementById('btn-import-json');
  const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
  btnImport?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', handleImportFile);
}

// ========== IMPORT ==========

async function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  (e.target as HTMLInputElement).value = '';

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      toast('Invalid file: expected a JSON array of conversations.', 'error');
      return;
    }

    const incoming: Conversation[] = parsed;

    if (!isArchiveUnlocked()) {
      const existingKeys = new Set(state.conversations.map(c => `${c.create_time}|${c.title}`));
      const newOnes = incoming.filter(c => !existingKeys.has(`${c.create_time}|${c.title}`));
      pendingImportConversations = [...state.conversations, ...newOnes];

      const initialized = await isArchiveInitialized();
      if (initialized) {
        showPinUnlock();
        const errorEl = document.getElementById('unlock-pin-error');
        if (errorEl) errorEl.textContent = `Enter your PIN to import ${newOnes.length} conversation${newOnes.length !== 1 ? 's' : ''}.`;
      } else {
        showPinSetup();
        const errorEl = document.getElementById('setup-pin-error');
        if (errorEl) errorEl.textContent = `Create a PIN to import ${newOnes.length} conversation${newOnes.length !== 1 ? 's' : ''}.`;
      }
      return;
    }

    const existing = state.conversations;
    const existingKeys = new Set(existing.map(c => `${c.create_time}|${c.title}`));
    const newOnes = incoming.filter(c => !existingKeys.has(`${c.create_time}|${c.title}`));
    const merged = [...existing, ...newOnes];

    await saveConversations(merged);
    state.conversations = merged;
    state.filteredConversations = [...merged];
    renderConversationList();
    updateStats();
    toast(`Imported ${newOnes.length} new conversation${newOnes.length !== 1 ? 's' : ''}. ${incoming.length - newOnes.length} duplicates skipped. Total: ${merged.length}.`, 'success', 5000);
  } catch (err) {
    console.error('[ChatGPT Archive] Import failed:', err);
    toast('Failed to import: ' + (err instanceof Error ? err.message : String(err)), 'error', 6000);
  }
}

// ========== ADVANCED SEARCH (inline sidebar panel) ==========

function populateModelFilter() {
  const sel = document.getElementById('adv-model') as HTMLSelectElement;
  if (!sel) return;
  const models = getModelUsage(state.conversations);
  sel.innerHTML = '<option value="">All models</option>' +
    models.map(m => `<option value="${escapeHtml(m.model)}">${escapeHtml(m.model)}</option>`).join('');
}

function setupAdvancedSearch() {
  const panel = document.getElementById('advanced-filters');
  const btn = document.getElementById('btn-advanced-search');

  document.getElementById('btn-adv-apply')?.addEventListener('click', () => {
    applyAdvancedSearch();
    btn?.classList.add('filter-active');
  });

  document.getElementById('btn-adv-clear')?.addEventListener('click', () => {
    (document.getElementById('adv-date-from') as HTMLInputElement).value = '';
    (document.getElementById('adv-date-to') as HTMLInputElement).value = '';
    (document.getElementById('adv-role') as HTMLSelectElement).value = '';
    (document.getElementById('adv-min-msgs') as HTMLInputElement).value = '';
    (document.getElementById('adv-model') as HTMLSelectElement).value = '';
    (document.getElementById('adv-hour') as HTMLInputElement).value = '';
    // Also clear main search
    if (elements.searchInput) (elements.searchInput as HTMLInputElement).value = '';
    state.searchQuery = '';
    state.filteredConversations = [...state.conversations];
    renderConversationList();
    btn?.classList.remove('filter-active');
    panel?.classList.add('hidden');
  });
}

function showAdvancedSearch() {
  const panel = document.getElementById('advanced-filters');
  const btn = document.getElementById('btn-advanced-search');
  if (!panel) return;
  const isOpen = !panel.classList.contains('hidden');
  panel.classList.toggle('hidden', isOpen);
  btn?.classList.toggle('filter-active', !isOpen);
}

function applyAdvancedSearch() {
  const keywords = ((elements.searchInput as HTMLInputElement)?.value || '').trim().toLowerCase();
  const dateFrom = (document.getElementById('adv-date-from') as HTMLInputElement)?.value;
  const dateTo = (document.getElementById('adv-date-to') as HTMLInputElement)?.value;
  const role = (document.getElementById('adv-role') as HTMLSelectElement)?.value;
  const minMsgs = parseInt((document.getElementById('adv-min-msgs') as HTMLInputElement)?.value || '0') || 0;

  let filtered = [...state.conversations];

  if (keywords) {
    filtered = filtered.filter(c => {
      const inTitle = c.title?.toLowerCase().includes(keywords);
      const inMessages = c.messages?.some(m => {
        if (role && m.role !== role) return false;
        return (m.content || '').toLowerCase().includes(keywords);
      });
      return inTitle || inMessages;
    });
  } else if (role) {
    filtered = filtered.filter(c => c.messages?.some(m => m.role === role));
  }

  if (dateFrom) {
    const from = new Date(dateFrom).getTime() / 1000;
    filtered = filtered.filter(c => (c.create_time || 0) >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo).getTime() / 1000 + 86400;
    filtered = filtered.filter(c => (c.create_time || 0) <= to);
  }
  if (minMsgs > 0) {
    filtered = filtered.filter(c => (c.messages?.length || 0) >= minMsgs);
  }

  const model = (document.getElementById('adv-model') as HTMLSelectElement)?.value;
  if (model) {
    filtered = filtered.filter(c => c.messages?.some(m => m.model === model));
  }

  const hourVal = (document.getElementById('adv-hour') as HTMLInputElement)?.value;
  const hour = hourVal !== '' ? parseInt(hourVal) : NaN;
  if (!isNaN(hour) && hour >= 0 && hour <= 23) {
    filtered = filtered.filter(c => new Date((c.create_time || 0) * 1000).getHours() === hour);
  }

  state.filteredConversations = filtered;
  renderConversationList();
}

function applyFilterFromAnalytics(params: {
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  model?: string;
  hour?: number;
}) {
  // Set all filter DOM fields
  (document.getElementById('adv-date-from') as HTMLInputElement).value = params.dateFrom || '';
  (document.getElementById('adv-date-to') as HTMLInputElement).value = params.dateTo || '';
  (document.getElementById('adv-model') as HTMLSelectElement).value = params.model || '';
  (document.getElementById('adv-hour') as HTMLInputElement).value = params.hour !== undefined ? String(params.hour) : '';
  if (elements.searchInput) (elements.searchInput as HTMLInputElement).value = params.keyword || '';
  state.searchQuery = params.keyword || '';

  // Apply filter
  applyAdvancedSearch();

  // Show filter-active state
  document.getElementById('btn-advanced-search')?.classList.add('filter-active');

  // Navigate away from analytics
  elements.analysisView?.classList.add('hidden');
  if (state.selectedConversation) {
    elements.detailView?.classList.remove('hidden');
  } else {
    document.getElementById('empty-state')?.classList.remove('hidden');
  }

  // Expand the filter panel so user can see what's active
  document.getElementById('advanced-filters')?.classList.remove('hidden');
}

// ========== ANALYTICS ==========

async function showAnalytics() {
  if (state.conversations.length === 0) {
    toast('No conversations to analyze. Import or backup first.', 'info');
    return;
  }

  const analysisEl = elements.analysisView;
  if (!analysisEl) return;

  // Show analysis in main content — hide other views
  document.getElementById('empty-state')?.classList.add('hidden');
  elements.detailView?.classList.add('hidden');
  analysisEl.classList.remove('hidden');
  analysisEl.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading analytics...</div>';

  const stats = getStats(state.conversations);
  const heatmap = getMonthlyHeatmap(state.conversations);
  const clock = getHourlyClock(state.conversations);
  const topics = getTopTopics(state.conversations, 20);
  const models = getModelUsage(state.conversations);

  analysisEl.innerHTML = `
    <div class="analysis-header">
      <h2>📊 Analytics — ${stats.totalChats.toLocaleString()} conversations</h2>
      <button class="btn-close-analysis" id="btn-close-analysis">✕ Close</button>
    </div>
    <div class="analysis-content">
      <div class="analysis-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.totalChats.toLocaleString()}</div>
            <div class="stat-label">Conversations</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalMessages.toLocaleString()}</div>
            <div class="stat-label">Messages</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalWords.toLocaleString()}</div>
            <div class="stat-label">Words</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Math.round(stats.averageMessagesPerChat)}</div>
            <div class="stat-label">Avg Messages/Chat</div>
          </div>
        </div>
        <p class="date-range">Date range: <strong>${stats.dateRange.start}</strong> → <strong>${stats.dateRange.end}</strong></p>
      </div>

      <div class="analysis-section">
        <h3 class="analysis-section-title">📅 Monthly Activity</h3>
        <div class="heatmap">${renderHeatmap(heatmap)}</div>
      </div>

      <div class="analysis-section">
        <h3 class="analysis-section-title">🕐 Hourly Activity</h3>
        <div class="clock-chart">${renderClock(clock)}</div>
        <div class="clock-labels">
          <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
        </div>
      </div>

      <div class="analysis-section">
        <h3 class="analysis-section-title">💬 Top Topics</h3>
        <div class="topics-list">${renderTopics(topics)}</div>
      </div>

      <div class="analysis-section">
        <h3 class="analysis-section-title">🤖 Model Usage</h3>
        <div class="topics-list">${renderModels(models)}</div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-analysis')?.addEventListener('click', () => {
    analysisEl.classList.add('hidden');
    if (state.selectedConversation) {
      elements.detailView?.classList.remove('hidden');
    } else {
      document.getElementById('empty-state')?.classList.remove('hidden');
    }
  });

  // Wire up clickable analytics
  analysisEl.querySelectorAll('.heatmap-row[data-month]').forEach(row => {
    row.addEventListener('click', () => {
      const month = row.getAttribute('data-month')!;
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      applyFilterFromAnalytics({
        dateFrom: `${month}-01`,
        dateTo: `${month}-${String(lastDay).padStart(2, '0')}`
      });
    });
  });

  analysisEl.querySelectorAll('.clock-bar[data-hour]').forEach(bar => {
    bar.addEventListener('click', () => {
      applyFilterFromAnalytics({ hour: parseInt(bar.getAttribute('data-hour')!) });
    });
  });

  analysisEl.querySelectorAll('.topic-item[data-word]').forEach(item => {
    item.addEventListener('click', () => {
      applyFilterFromAnalytics({ keyword: item.getAttribute('data-word')! });
    });
  });

  analysisEl.querySelectorAll('.topic-item[data-model]').forEach(item => {
    item.addEventListener('click', () => {
      applyFilterFromAnalytics({ model: item.getAttribute('data-model')! });
    });
  });
}

function renderHeatmap(heatmap: HeatmapData): string {
  const entries = Object.entries(heatmap).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return '<p style="color:var(--text-muted)">No data</p>';
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return entries.map(([period, count]) => {
    const width = Math.round((count / max) * 300);
    return `
      <div class="heatmap-row" data-month="${period}" style="cursor:pointer" title="Click to filter by ${period}">
        <div class="heatmap-label">${period}</div>
        <div class="heatmap-bar" style="width:${width}px;background:var(--primary)"></div>
        <div class="heatmap-count">${count}</div>
      </div>`;
  }).join('');
}

function renderClock(clock: number[]): string {
  const max = Math.max(...clock, 1);
  return clock.map((count, h) => {
    const height = Math.round((count / max) * 120) + 5;
    return `<div class="clock-bar" data-hour="${h}" style="height:${height}px;cursor:pointer" title="${h}:00 — ${count} messages (click to filter)"></div>`;
  }).join('');
}

function renderTopics(topics: TopicCount[]): string {
  if (topics.length === 0) return '<p style="color:var(--text-muted)">No topic data</p>';
  const max = topics[0].count;
  return topics.map((t, i) => {
    const width = Math.round((t.count / max) * 260);
    return `
      <div class="topic-item" data-word="${escapeHtml(t.word)}" style="cursor:pointer" title="Click to filter by '${escapeHtml(t.word)}'">
        <div class="topic-rank">#${i + 1}</div>
        <div class="topic-word">${escapeHtml(t.word)}</div>
        <div class="topic-bar" style="width:${width}px"></div>
        <div class="topic-count">${t.count}</div>
      </div>`;
  }).join('');
}

function renderModels(models: ModelUsage[]): string {
  if (models.length === 0) return '<p style="color:var(--text-muted)">No model data found</p>';
  const max = models[0].count;
  return models.map((m, i) => {
    const width = Math.round((m.count / max) * 200);
    return `
      <div class="topic-item" data-model="${escapeHtml(m.model)}" style="cursor:pointer" title="Click to filter by model '${escapeHtml(m.model)}'">
        <div class="topic-rank">#${i + 1}</div>
        <div class="topic-word" style="width:220px">${escapeHtml(m.model)}</div>
        <div class="topic-bar" style="width:${width}px"></div>
        <div class="topic-count">${m.count}</div>
      </div>`;
  }).join('');
}

// ========== EXPORT ==========

function exportToCSV() {
  if (state.conversations.length === 0) {
    toast('No conversations to export.', 'info');
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

function exportToJSON() {
  if (state.conversations.length === 0) {
    toast('No conversations to export.', 'info');
    return;
  }
  const json = JSON.stringify(state.conversations, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chatgpt-archive-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ========== RENDER CONVERSATION LIST ==========

function renderConversationList(searchResults?: Array<{ index: number; title: string; score?: number }>) {
  if (!elements.conversationList) return;

  const items = searchResults || state.filteredConversations.map(c => ({
    index: state.conversations.indexOf(c),
    title: c.title || 'Untitled'
  }));

  if (items.length === 0) {
    elements.conversationList.innerHTML = '<div style="padding:16px;color:var(--text-faint);font-size:13px;text-align:center">No conversations found</div>';
    return;
  }

  elements.conversationList.innerHTML = items.map(item => {
    const conv = state.conversations[item.index];
    if (!conv) return '';
    const date = parseDate(conv.create_time).toLocaleDateString();
    const msgCount = conv.messages?.length || 0;
    const score = 'score' in item && item.score !== undefined
      ? `<span class="search-score">${Math.round((item.score || 0) * 100)}%</span>` : '';
    const isActive = item.index === state.selectedIndex ? ' active' : '';

    return `
      <div class="conversation-item${isActive}" data-index="${item.index}">
        <div class="conv-header">
          <h3>${escapeHtml(conv.title || 'Untitled')}</h3>
          ${score}
        </div>
        <div class="conv-meta">
          <span>📅 ${date}</span>
          <span>💬 ${msgCount}</span>
        </div>
      </div>`;
  }).join('');

  elements.conversationList.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.getAttribute('data-index') || '0');
      selectConversation(index);
    });
  });

  // Update filter count
  const countEl = document.getElementById('filter-count');
  if (countEl) {
    const total = state.conversations.length;
    const shown = items.length;
    countEl.textContent = shown < total
      ? `Showing ${shown} of ${total} conversations`
      : `${total} conversation${total !== 1 ? 's' : ''}`;
  }
}

function selectConversation(index: number) {
  state.selectedIndex = index;
  state.selectedConversation = state.conversations[index];

  // Update active class without re-rendering entire list
  elements.conversationList?.querySelectorAll('.conversation-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.getAttribute('data-index') || '-1') === index);
  });

  renderDetailView();
}

// ========== RENDER DETAIL VIEW ==========

function parseDate(timestamp: number | null | undefined): Date {
  if (!timestamp) return new Date(0);
  // ChatGPT exports use Unix seconds; JS Date expects milliseconds
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return new Date(ms);
}

function renderDetailView() {
  const conv = state.selectedConversation;
  if (!conv || !elements.detailView) return;

  document.getElementById('empty-state')?.classList.add('hidden');
  elements.detailView.classList.remove('hidden');

  const date = parseDate(conv.create_time).toLocaleString();
  const msgCount = conv.messages?.length || 0;

  // Update toolbar meta
  const toolbarMeta = document.getElementById('toolbar-meta');
  if (toolbarMeta) {
    toolbarMeta.innerHTML = `
      <span class="meta-title">${escapeHtml(conv.title || 'Untitled')}</span>
      <span>📅 ${date}</span>
      <span>💬 ${msgCount} messages</span>
    `;
  }

  elements.detailView.innerHTML = `
    <div class="detail-header">
      <h2 class="detail-title">${escapeHtml(conv.title || 'Untitled')}</h2>
      <div class="detail-meta">
        <span>📅 ${date}</span>
        <span>💬 ${msgCount} messages</span>
      </div>
    </div>
    <div class="detail-messages">
      ${(conv.messages || []).map(msg => {
        const content = msg.content || '';
        const role = msg.role || 'unknown';
        const label = role === 'user' ? '👤 You' : role === 'assistant' ? '🤖 Assistant' : `⚙️ ${role}`;
        return `
          <div class="message ${escapeHtml(role)}">
            <div class="message-role">${label}</div>
            <div class="message-content">${formatContent(content)}</div>
          </div>`;
      }).join('')}
    </div>
  `;
}

// ========== MARKDOWN FORMATTER ==========

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function formatContent(content: string): string {
  if (!content) return '';

  const placeholders: string[] = [];

  // 1. Extract fenced code blocks (save with escaped content)
  let text = content.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = escapeHtml(code.trimEnd());
    const langLabel = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : '';
    placeholders.push(`<pre>${langLabel}<code>${escaped}</code></pre>`);
    return `\x01${placeholders.length - 1}\x01`;
  });

  // 2. Extract inline code
  text = text.replace(/`([^`\n]+)`/g, (_, code) => {
    placeholders.push(`<code>${escapeHtml(code)}</code>`);
    return `\x01${placeholders.length - 1}\x01`;
  });

  // 3. Escape remaining HTML
  text = escapeHtml(text);

  // 4. Apply markdown patterns
  // Headers
  text = text.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  text = text.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  // Bold+italic, then bold, then italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  text = text.replace(/_([^_\n]+)_/g, '<em>$1</em>');

  // Horizontal rule
  text = text.replace(/^---+$/gm, '<hr>');

  // Lists
  text = processMarkdownLists(text);

  // 5. Convert to paragraphs
  const blocks = text.split(/\n\n+/);
  text = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    // Don't wrap block elements in <p>
    if (/^<(h[2-4]|ul|ol|li|hr|pre|blockquote)/i.test(trimmed)) return trimmed;
    if (/^\x01\d+\x01$/.test(trimmed)) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean).join('\n');

  // 6. Restore code placeholders
  text = text.replace(/\x01(\d+)\x01/g, (_, i) => placeholders[parseInt(i)]);

  return text;
}

function processMarkdownLists(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  for (const line of lines) {
    const ulMatch = line.match(/^[*-+] (.+)$/);
    const olMatch = line.match(/^\d+\. (.+)$/);

    if (ulMatch) {
      if (listType !== 'ul') {
        if (listType) result.push(`</${listType}>`);
        result.push('<ul>');
        listType = 'ul';
      }
      result.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (listType !== 'ol') {
        if (listType) result.push(`</${listType}>`);
        result.push('<ol>');
        listType = 'ol';
      }
      result.push(`<li>${olMatch[1]}</li>`);
    } else {
      if (listType) {
        result.push(`</${listType}>`);
        listType = null;
      }
      result.push(line);
    }
  }

  if (listType) result.push(`</${listType}>`);
  return result.join('\n');
}

// ========== TOAST NOTIFICATIONS ==========

function toast(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
    <button class="toast-close" title="Dismiss">✕</button>
  `;

  const dismiss = () => {
    el.classList.add('toast-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };

  el.querySelector('.toast-close')!.addEventListener('click', dismiss);
  container.appendChild(el);
  setTimeout(dismiss, duration);
}

// ========== STATS ==========

function updateStats() {
  if (!elements.statsContainer) return;
  const total = state.conversations.length;
  const totalMessages = state.conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0);
  elements.statsContainer.innerHTML = `
    <span>📚 ${total.toLocaleString()} conversations</span>
    <span>💬 ${totalMessages.toLocaleString()} messages</span>
  `;
}

// ========== BOOTSTRAP ==========

document.addEventListener('DOMContentLoaded', () => {
  initViewerApp().catch(console.error);
});
