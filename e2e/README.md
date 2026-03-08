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
