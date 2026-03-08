# ChatGPT Archive - E2E Testing

This directory contains end-to-end tests for the ChatGPT Archive Chrome extension using Playwright.

## Structure

```
e2e/
├── fixtures/
│   └── extension.ts       # Playwright fixtures for loading extension
├── pages/
│   ├── viewer.page.ts     # Viewer Page Object Model
│   ├── popup.page.ts      # Popup Page Object Model
│   └── chatgpt.page.ts    # ChatGPT website Page Object
├── tests/
│   ├── viewer-operations.spec.ts   # Viewer functionality tests
│   ├── popup.spec.ts               # Popup tests
│   └── backup-flow.spec.ts         # End-to-end backup tests
├── utils/
│   └── test-data.ts       # Mock data and test utilities
├── test-results/          # Screenshots, videos, traces (gitignored)
└── README.md              # This file
```

## Prerequisites

1. **Build the extension first:**
   ```bash
   npm run build
   # or
   npm run dev
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium
   ```

## Running Tests

### All tests
```bash
npm run test:e2e
```

### With UI (interactive)
```bash
npm run test:e2e:ui
```

### Debug mode
```bash
npm run test:e2e:debug
```

### Specific test file
```bash
npx playwright test viewer-operations
```

### With headed browser (visible)
```bash
npx playwright test --headed
```

## Test Coverage

### Viewer Operations (`viewer-operations.spec.ts`)
- **PIN Operations**: Setup, unlock, incorrect PIN handling
- **Conversation Browsing**: Display, selection, navigation
- **Search**: Title search, content search, no results, clear
- **Category Management**: Display, assign, filter, add new
- **Export Operations**: JSON, Markdown, HTML, PDF exports
- **Message Visibility**: Toggle, expand all, collapse all
- **Settings**: PIN change, theme switch, auto-lock toggle
- **Pinned Conversations**: Pin, unpin, pinned section
- **Keyboard Shortcuts**: Cmd/Ctrl+K, arrow keys, Enter

### Popup Tests (`popup.spec.ts`)
- **Initial State**: Load, backup button, empty stats
- **Backup Operations**: Trigger, progress, cancel, disable
- **Archive Statistics**: Count, storage, last backup time
- **Navigation**: Open viewer, side panel, settings
- **PIN Protection**: Require PIN, unlock, wrong PIN
- **Error Handling**: Network errors, not on ChatGPT

### Backup Flow (`backup-flow.spec.ts`)
- **Content Script**: Injection into ChatGPT
- **End-to-End**: Complete backup workflow
- **Multiple Conversations**: Bulk backup
- **Error Scenarios**: Wrong page, cancellation

## Page Object Pattern

Tests use the Page Object Model for maintainability:

```typescript
const viewer = new ViewerPage(page, extensionId);
await viewer.goto();
await viewer.unlockWithPin('1234');
await viewer.search('React');
await viewer.exportAsJson();
```

## Adding New Tests

1. Create test file in `e2e/tests/`
2. Import fixtures: `import { test, expect } from '../fixtures/extension'`
3. Use page objects from `e2e/pages/`
4. Follow naming: `feature-name.spec.ts`

## Debugging Failed Tests

Tests automatically capture on failure:
- **Screenshots**: `e2e/test-results/*.png`
- **Videos**: `e2e/test-results/*.webm`
- **Traces**: `e2e/test-results/trace.zip` (open with `npx playwright show-trace`)

View HTML report:
```bash
npx playwright show-report
```

## CI/CD Integration

Tests run in headed mode (extensions don't work in headless). For CI:

```yaml
# GitHub Actions example
- name: Run E2E tests
  run: xvfb-run npm run test:e2e
```

## Known Limitations

1. **ChatGPT Tests**: Require login to ChatGPT for full backup flow tests
2. **Headless Mode**: Extensions require headed browser
3. **Service Workers**: MV3 service workers may suspend during tests
4. **Extension ID**: Dynamic per test run (handled by fixtures)

## Environment Variables

```bash
# Run with specific browser
PLAYWRIGHT_BROWSER=chromium npm run test:e2e

# Skip build check (if extension pre-built)
SKIP_BUILD_CHECK=1 npm run test:e2e
```

---

## Chrome Web Store Automation with Playwright MCP

We successfully used **Playwright MCP (Model Context Protocol)** to automate editing the Chrome Web Store listing. This saved significant manual effort filling out the store listing form.

### What We Did

Instead of manually filling out the Chrome Web Store Developer Dashboard, we used Playwright MCP to:

1. **Log into the Developer Dashboard** (`https://chrome.google.com/webstore/devconsole/`)
2. **Navigate to the extension's Store Listing page**
3. **Fill out all Privacy Practices fields automatically:**
   - Single purpose description
   - Permission justifications (activeTab, storage, downloads, sidePanel, host permissions)
   - Remote code declaration (set to "No")
   - Data usage certifications
   - Privacy policy URL
4. **Save the draft**

### Tools Used

- **Playwright MCP Server**: Provides browser automation capabilities via Model Context Protocol
- **Browser automation**: Clicking, typing, form filling, navigation
- **Page snapshots**: Understanding form structure and available fields

### How to Replicate

If you need to edit the Chrome Web Store listing again:

1. **Ensure Playwright MCP is available** in your MCP client (Claude Desktop, VS Code, etc.)

2. **Navigate to the Developer Dashboard:**
   ```
   browser_navigate: https://chrome.google.com/webstore/devconsole/
   ```

3. **Log in** (if not already logged in):
   - The MCP can handle Google authentication with 2FA if you provide credentials

4. **Navigate to your extension:**
   - Click on "ChatGPT Archive - Secure Backup & Viewer" from the items list

5. **Edit specific tabs:**
   - **Store Listing**: Description, category, screenshots, promo tiles
   - **Privacy**: Permission justifications, data usage, certifications
   - **Package**: Upload new ZIP files
   - **Distribution**: Visibility settings

6. **Fill forms programmatically:**
   ```typescript
   // Example pattern used:
   await browser_type({ ref: "e120", text: "Single purpose description..." });
   await browser_click({ ref: "e214", element: "No remote code radio" });
   await browser_click({ ref: "e58", element: "Save draft button" });
   ```

### What Was Automated

| Field | Content |
|-------|---------|
| **Single purpose** | "This extension allows users to backup, view, and organize their ChatGPT conversations locally..." |
| **activeTab** | "Required to access the active ChatGPT tab to extract conversation data..." |
| **storage** | "Required to store backed-up ChatGPT conversations locally with PIN-based AES-256 encryption..." |
| **downloads** | "Required to export backed-up conversations to files..." |
| **sidePanel** | "Required to display the ChatGPT Archive viewer in Chrome's side panel..." |
| **Host permission** | "Required to access chatgpt.com to extract conversation data..." |
| **Remote code** | Selected "No, I am not using Remote code" |
| **Data collected** | Checked "Website content" |
| **Certifications** | All 3 data usage certifications checked |
| **Privacy URL** | `https://github.com/EndemicMedia/chatgpt-archive/blob/main/PRIVACY.md` |

### Extension ID

Your Extension ID is: **`oplklijgllkfnaeleekonfhbkbnhfklk`**

This is needed for:
- GitHub Actions auto-publishing
- Chrome Web Store API calls
- Direct store listing URL: `https://chrome.google.com/webstore/devconsole/[publisher-id]/oplklijgllkfnaeleekonfhbkbnhfklk/edit`

### Manual Edit Alternative

If you prefer not to use automation, you can manually edit at:
```
https://chrome.google.com/webstore/devconsole/
→ Items → ChatGPT Archive → Store Listing / Privacy / etc.
```

All the text content that was filled is documented in the privacy practices section above.
