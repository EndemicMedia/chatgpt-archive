/**
 * E2E Test Suite for ChatGPT Archive
 * 
 * Run all tests:
 *   npm run test:e2e
 * 
 * Run with UI:
 *   npm run test:e2e:ui
 * 
 * Run specific test:
 *   npx playwright test viewer-operations
 * 
 * Debug:
 *   npm run test:e2e:debug
 */

// Re-export fixtures and page objects
export { test, expect } from './fixtures/extension';
export { ViewerPage } from './pages/viewer.page';
export { PopupPage } from './pages/popup.page';
export { ChatGPTPage } from './pages/chatgpt.page';
export * from './utils/test-data';
