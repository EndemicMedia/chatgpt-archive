// ChatGPT Archive Viewer Script
// Handles PIN entry, conversation display, and interactions

console.log('[ChatGPT Archive] Viewer loaded');

// PIN handling
let currentPin = '';
const correctPin = '1234'; // This should be retrieved from storage

// DOM Elements
const pinScreen = document.getElementById('pin-screen');
const app = document.getElementById('app');
const pinDots = document.querySelectorAll('.pin-dot');
const pinError = document.getElementById('pin-error');
const pinKeys = document.querySelectorAll('.pin-key');

// PIN keypad handler
pinKeys.forEach(key => {
  key.addEventListener('click', () => {
    const keyValue = key.getAttribute('data-key');
    
    if (keyValue === 'clear') {
      currentPin = '';
      updatePinDisplay();
      pinError.textContent = '';
    } else if (keyValue === 'enter') {
      checkPin();
    } else {
      if (currentPin.length < 4) {
        currentPin += keyValue;
        updatePinDisplay();
        pinError.textContent = '';
      }
    }
  });
});

function updatePinDisplay() {
  pinDots.forEach((dot, index) => {
    if (index < currentPin.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });
}

function checkPin() {
  if (currentPin === correctPin) {
    // Unlock
    pinScreen.classList.add('hidden');
    app.classList.remove('hidden');
    loadConversations();
  } else {
    pinError.textContent = 'Incorrect PIN';
    currentPin = '';
    updatePinDisplay();
  }
}

// Load conversations from storage
async function loadConversations() {
  try {
    const result = await browser.storage.local.get('lastBackupData');
    const conversations = result.lastBackupData || [];
    displayConversations(conversations);
  } catch (error) {
    console.error('Failed to load conversations:', error);
  }
}

// Display conversations in the list
function displayConversations(conversations) {
  const conversationList = document.getElementById('conversation-list');
  if (!conversationList) return;
  
  conversationList.innerHTML = '';
  
  conversations.forEach(conv => {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    item.innerHTML = `
      <h3>${escapeHtml(conv.title)}</h3>
      <p>${new Date(conv.create_time).toLocaleDateString()}</p>
    `;
    conversationList.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export functions for testing
export { currentPin, updatePinDisplay, checkPin };
