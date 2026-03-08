# ChatGPT Archive

A secure, offline-first browser extension for backing up and viewing your ChatGPT conversations.

## Features

### Core Features
- 🔒 **PIN Protection** - AES-256 encryption with PBKDF2 key derivation
- 📦 **Local Storage** - All data stays on your device
- 🔍 **Full-Text Search** - Fuzzy search across all conversations
- 🏷️ **Categories** - Color-coded organization (like browser tab groups)
- 👁️ **Visibility Controls** - Hide/show individual questions or answers

### Export Formats
- **JSON** - Complete data export
- **Markdown** - Standard Markdown with code blocks
- **Obsidian** - With YAML frontmatter and wikilinks
- **Workflowy** - OPML format for outline import
- **Notion** - Direct API integration

### Security
- Client-side encryption using Web Crypto API
- PIN never stored in plaintext
- PBKDF2 with 100,000 iterations
- AES-256-GCM encryption

## Development

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
cd extension
npm install
```

### Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Build for Firefox
npm run build:firefox
```

### Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Project Structure

```
src/
├── background/          # Service worker
├── content-scripts/     # DOM extraction
├── popup/              # Extension popup UI
├── viewer/             # Full-page archive viewer
├── utils/              # Utilities
│   ├── crypto.ts       # Encryption/PIN
│   ├── storage.ts      # Storage with compression
│   ├── export/         # Export formats
│   │   ├── markdown.ts
│   │   ├── obsidian.ts
│   │   ├── workflowy.ts
│   │   └── notion.ts
│   └── types.ts        # TypeScript definitions
└── assets/             # Icons and images

e2e/                    # Playwright E2E tests
```

## Architecture

### Encryption Flow
```
User PIN → PBKDF2 (100k iterations) → AES-256 Key
                                          ↓
                    Data → Compression → Encryption → Storage
```

### Storage
- `browser.storage.local` for encrypted data
- pako.js for compression
- Per-message visibility settings
- Search index for fast queries

## Browser Support

- Chrome/Edge (Manifest V3)
- Firefox (Manifest V2)

## Privacy

- **No cloud** - Everything stays local
- **No tracking** - Zero analytics
- **Open source** - Auditable code

## Store Submission

### Chrome Web Store

#### Automated Store Listing (Recommended)

We used **Playwright MCP** (Model Context Protocol) to automate filling out the Chrome Web Store listing. This approach:
- Saves hours of manual form filling
- Ensures consistency across fields
- Can be repeated for updates

**Extension ID:** `oplklijgllkfnaeleekonfhbkbnhfklk`

See [`e2e/README.md`](e2e/README.md#chrome-web-store-automation-with-playwright-mcp) for detailed automation documentation.

#### Manual Submission

1. Build the extension:
```bash
npm run build
```

2. Zip the build output:
```bash
cd .output/chrome-mv3
zip -r ../../chatgpt-archive-1.0.0.zip .
```

3. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

4. Click "New Item" and upload the zip file

5. Fill in store listing:
   - Use content from `STORE_LISTING.md`
   - Upload screenshots (1280x800 or 640x400) from `assets/store/`
   - Upload promotional images (optional) from `assets/store/`
   - Privacy policy: Use `PRIVACY.md` content
   - Category: Productivity
   - **Privacy Practices**: All permission justifications are documented in the e2e README

6. Submit for review (typically 1-3 business days)

### Firefox Add-ons

1. Build for Firefox:
```bash
npm run build:firefox
```

2. Zip the build output from `.output/firefox-mv2/`

3. Go to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)

4. Submit new add-on and upload the zip

5. Use content from `STORE_LISTING.md` for description

### Required Assets

- Icons: 16x16, 32x32, 48x48, 128x128 PNG (in `src/public/icon/`)
- Screenshots: At least 1-3 screenshots showing the extension
- Privacy Policy: See `PRIVACY.md`

## License

MIT
