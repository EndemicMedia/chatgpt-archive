// API utilities for fetching conversation data from ChatGPT

import type { Conversation, ConversationMessage, RawConversation } from './types';

// Configuration
const INITIAL_BACKOFF = 10000;
const BACKOFF_MULTIPLIER = 2;
const MAX_ATTEMPTS = 3;

/**
 * Load the authentication token from ChatGPT's session endpoint
 */
export async function loadToken(): Promise<string> {
  const res = await fetch('https://chatgpt.com/api/auth/session');
  
  if (!res.ok) {
    throw new Error(`Failed to fetch token: ${res.status} ${res.statusText}`);
  }
  
  const json = await res.json();
  if (!json.accessToken) {
    throw new Error('No access token found. Make sure you are logged in to ChatGPT.');
  }
  
  return json.accessToken;
}

/**
 * Fetch a single conversation by ID with retry logic
 */
export async function fetchConversation(
  token: string, 
  id: string, 
  attempt: number = 1
): Promise<RawConversation | null> {
  try {
    const res = await fetch(
      `https://chatgpt.com/backend-api/conversation/${id}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json();

  } catch (error) {
    if (attempt >= MAX_ATTEMPTS) {
      console.error(`[ChatGPT Backup] Failed to fetch conversation ${id} after ${MAX_ATTEMPTS} attempts`);
      return null;
    } else {
      const backoff = INITIAL_BACKOFF * Math.pow(BACKOFF_MULTIPLIER, attempt);
      console.log(`[ChatGPT Backup] Error fetching ${id}, retrying in ${backoff}ms (attempt ${attempt})`);
      await sleep(backoff);
      return fetchConversation(token, id, attempt + 1);
    }
  }
}

/**
 * Parse raw conversation data into a simplified format
 */
export function parseConversation(rawConversation: RawConversation, includeSystem: boolean = false): Conversation {
  const id = rawConversation.id;
  const title = rawConversation.title || 'Untitled';
  const create_time = rawConversation.create_time;
  const mapping = rawConversation.mapping;
  const keys = Object.keys(mapping);
  const messages: ConversationMessage[] = [];

  for (const k of keys) {
    const msgPayload = mapping[k];
    const msg = msgPayload.message;
    if (!msg) continue;

    const role = msg.author?.role || 'unknown';
    
    // Skip system messages unless explicitly included
    if (role === 'system' && !includeSystem) {
      continue;
    }
    
    const model = msg.metadata?.model_slug || 'unknown';
    const msg_create_time = msg.create_time || 0;

    let content = '';
    if (msg.content?.parts) {
      content = msg.content.parts.join('\n');
    } else if (msg.content?.text) {
      content = msg.content.text;
    } else if (Array.isArray(msg.content)) {
      content = msg.content.map((c: any) => c.text || JSON.stringify(c)).join('\n');
    } else {
      content = JSON.stringify(msg.content);
    }

    messages.push({ role, content, model, create_time: msg_create_time });
  }

  return { id, messages, create_time, title };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
