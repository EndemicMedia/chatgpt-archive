// DOM-based ChatGPT backup script
// Extracts conversation IDs directly from the sidebar and fetches them via API
// Use this when the API pagination isn't returning all conversations

async function fetchConversation(token, id, maxAttempts = 3, attempt = 1) {
  const INITIAL_BACKOFF = 10000;
  const BACKOFF_MULTIPLIER = 2;
  try {
    const res = await fetch(
      `https://chatgpt.com/backend-api/conversation/${id}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json();

  } catch (error) {
    if (attempt >= maxAttempts) {
      console.error(`Failed to fetch conversation ${id} after ${maxAttempts} attempts.`);
      return null; // Return null instead of throwing to continue with other conversations
    } else {
      var backoff = INITIAL_BACKOFF * Math.pow(BACKOFF_MULTIPLIER, attempt);
      console.log(`Error fetching ${id}. Retrying in ${backoff}ms.`);
      await sleep(backoff);
      return fetchConversation(token, id, maxAttempts, attempt + 1);
    }
  }
}

function sleep(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseConversation(rawConversation) {
  const id = rawConversation.id; // UUID from URL (e.g., 67916cfc-9d50-8000-8283-ab6202daf8b8)
  const title = rawConversation.title;
  const create_time = rawConversation.create_time;
  const mapping = rawConversation.mapping;
  const keys = Object.keys(mapping);
  const messages = [];

  for (const k of keys) {
    const msgPayload = mapping[k];
    const msg = msgPayload.message;
    if (!msg) continue;

    const role = msg.author?.role || "unknown";
    const model = msg.metadata?.model_slug || "unknown";
    const msg_create_time = msg.create_time;

    let content = "";
    if (msg.content?.parts) {
      content = msg.content.parts.join("\n");
    } else if (msg.content?.text) {
      content = msg.content.text;
    } else if (Array.isArray(msg.content)) {
      content = msg.content.map(c => c.text || JSON.stringify(c)).join("\n");
    } else {
      content = JSON.stringify(msg.content);
    }

    messages.push({ role, content, model, create_time: msg_create_time });
  }

  return { id, messages, create_time, title };
}

function getDateFormat(date) {
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  const hours = ("0" + date.getHours()).slice(-2);
  const minutes = ("0" + date.getMinutes()).slice(-2);
  const seconds = ("0" + date.getSeconds()).slice(-2);
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

function downloadJson(data) {
  const jsonString = JSON.stringify(data, null, 2);
  const jsonBlob = new Blob([jsonString], { type: "application/json" });
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(jsonBlob);
  downloadLink.download = `gpt-backup-${getDateFormat(new Date())}.json`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  return new Promise((resolve) => {
    setTimeout(() => {
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadLink.href);
      resolve();
    }, 150);
  });
}

async function loadToken() {
  const res = await fetch("https://chatgpt.com/api/auth/session");
  if (!res.ok) throw new Error("failed to fetch token");
  const json = await res.json();
  return json.accessToken;
}

// Extract conversation IDs from the DOM sidebar
function extractConversationIdsFromDOM() {
  const historyDiv = document.getElementById('history');
  if (!historyDiv) {
    console.error('Could not find #history div. Make sure you are on chatgpt.com with the sidebar open.');
    return [];
  }
  
  // Get all links in the history sidebar
  const links = historyDiv.querySelectorAll('a[href^="/c/"]');
  const ids = [];
  
  for (const link of links) {
    const href = link.getAttribute('href');
    // Extract UUID from /c/UUID or /c/UUID/... patterns
    const match = href.match(/\/c\/([a-f0-9-]+)/i);
    if (match && match[1]) {
      ids.push(match[1]);
    }
  }
  
  // Remove duplicates while preserving order
  const uniqueIds = [...new Set(ids)];
  console.log(`Found ${uniqueIds.length} unique conversation IDs in DOM`);
  
  if (uniqueIds.length === 0) {
    console.warn('No conversation IDs found. Possible reasons:');
    console.warn('1. The sidebar is collapsed - click the hamburger menu to expand it');
    console.warn('2. Not logged in to ChatGPT');
    console.warn('3. The DOM structure has changed');
  }
  
  return uniqueIds;
}

// Scroll the sidebar to ensure all conversations are loaded
async function ensureAllConversationsLoaded() {
  const historyDiv = document.getElementById('history');
  if (!historyDiv) return;
  
  // Check if there's a scroll container within the history div
  const scrollContainer = historyDiv.querySelector('[class*="scroll"]') || historyDiv;
  
  let previousHeight = 0;
  let scrollAttempts = 0;
  const maxScrollAttempts = 10;
  
  while (scrollAttempts < maxScrollAttempts) {
    const currentHeight = scrollContainer.scrollHeight;
    if (currentHeight === previousHeight) {
      break; // No more content loading
    }
    
    previousHeight = currentHeight;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    console.log(`Scrolling to load more conversations... (${scrollAttempts + 1}/${maxScrollAttempts})`);
    await sleep(500); // Wait for content to load
    scrollAttempts++;
  }
  
  console.log(`Finished scrolling. Sidebar height: ${previousHeight}px`);
}

async function backupFromDOM() {
  console.log('=== Starting DOM-based ChatGPT Backup ===');
  
  // Ensure all conversations are loaded in the DOM
  await ensureAllConversationsLoaded();
  
  // Get auth token
  const token = await loadToken();
  console.log('✓ Got auth token');
  
  // Extract IDs from sidebar
  const conversationIds = extractConversationIdsFromDOM();
  
  if (conversationIds.length === 0) {
    console.error('No conversations found. Aborting.');
    return;
  }
  
  console.log(`\nBacking up ${conversationIds.length} conversations...`);
  console.log('This will take approximately ' + Math.ceil(conversationIds.length / 60) + ' minutes (rate limited to 60 req/min)\n');
  
  const allConversations = [];
  const failedIds = [];
  
  // Fetch each conversation
  for (let i = 0; i < conversationIds.length; i++) {
    const id = conversationIds[i];
    
    // Log progress every 10 conversations
    if (i % 10 === 0 || i === conversationIds.length - 1) {
      const progress = Math.round(((i + 1) / conversationIds.length) * 100);
      console.log(`Progress: ${i + 1}/${conversationIds.length} (${progress}%)`);
    }
    
    // Rate limit: 60 conversations/min = 1 per second
    await sleep(1000);
    
    const rawConversation = await fetchConversation(token, id);
    
    if (rawConversation) {
      try {
        const conversation = parseConversation(rawConversation);
        allConversations.push(conversation);
      } catch (parseError) {
        console.error(`Failed to parse conversation ${id}:`, parseError);
        failedIds.push(id);
      }
    } else {
      failedIds.push(id);
    }
  }
  
  console.log(`\n=== Backup Complete ===`);
  console.log(`Successfully backed up: ${allConversations.length} conversations`);
  console.log(`Failed: ${failedIds.length} conversations`);
  
  if (failedIds.length > 0) {
    console.log('Failed IDs:', failedIds);
  }
  
  // Download the backup
  await downloadJson(allConversations);
  console.log('✓ Downloaded backup file');
  
  return { allConversations, failedIds };
}

// Run the backup
backupFromDOM().then((result) => {
  console.log('GPT-BACKUP::DONE');
}).catch((e) => {
  console.error('Backup failed:', e);
});
