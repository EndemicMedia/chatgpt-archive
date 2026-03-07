# ChatGPT Archive - Design Specification

## Overview

An enhanced browser extension for backing up and locally viewing ChatGPT conversations with PIN protection, advanced visualization, and third-party integrations.

---

## Architecture

### UI Modes

1. **Popup** (380x600px) - Quick backup/restore actions
2. **Side Panel** (400px width) - Archive viewer with search
3. **Full Page** (100% viewport) - Advanced chat visualization
4. **Content Script** (Shadow DOM) - In-page chat tools

---

## Feature Specification

### 1. PIN Protection System

```
┌─────────────────────────────────────┐
│  🔒 ChatGPT Archive                 │
├─────────────────────────────────────┤
│                                     │
│  Enter PIN to access archives       │
│                                     │
│  ┌───┬───┬───┬───┐                 │
│  │ • │ • │   │   │                 │
│  └───┴───┴───┴───┘                 │
│                                     │
│  [1] [2] [3]                       │
│  [4] [5] [6]                       │
│  [7] [8] [9]                       │
│  [C] [0] [✓]                       │
│                                     │
│  🔐 Data is encrypted locally       │
└─────────────────────────────────────┘
```

**Features:**
- 4-6 digit PIN
- bcrypt encryption for stored data
- Auto-lock after 5 minutes of inactivity
- 3 wrong attempts = 5 minute lockout
- Optional biometric (WebAuthn) on supported devices
- "Forgot PIN" = clear all data (security measure)

---

### 2. Archive Viewer (Side Panel)

```
┌──────────────────────────────────────────────────────┐
│  🔍 Search archives...              ⚙️  [+]         │
├──────────────────────────────────────────────────────┤
│  📁 Categories                        [v]           │
│  🔴 Work (45)  🔵 Personal (23)  🟢 Ideas (12)     │
├──────────────────────────────────────────────────────┤
│  📄 All Conversations (1,247)                       │
│                                                     │
│  🔴 React Component Optimization        2 days ago │
│     "How can I optimize the rendering..."         │
│                                                     │
│  🔵 Trip to Japan Planning              3 days ago │
│     "Create an itinerary for 2 weeks..."          │
│                                                     │
│  🟢 Business Ideas Brainstorm          1 week ago  │
│     "What are some SaaS ideas in the..."          │
│                                                     │
│  ⚪ Random Coding Question             2 weeks ago │
│     "Explain async/await in JavaScript..."        │
│                                                     │
└──────────────────────────────────────────────────────┘
```

**Features:**
- Real-time search (title + content)
- Filter by category/color
- Sort by date, title, message count
- Quick preview on hover
- Keyboard navigation (↑↓ Enter)
- Export selected conversations

---

### 3. Advanced Chat Visualization (Full Page)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🏠  ChatGPT Archive                                          [🔒 Lock] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🔴 React Component Optimization                              [Edit ✏️] │
│  📅 Jan 15, 2026 • 24 messages • Model: GPT-4                           │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 👤 User (click to toggle)                                          │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ How can I optimize React component rendering?                     │ │
│  │ [👁️ Visible]                                                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🤖 Assistant                                                       │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ Here are several strategies:                                      │ │
│  │                                                                   │ │
│  │ 1. Use React.memo for pure components                            │ │
│  │ ```typescript                                                      │ │
│  │ const MyComponent = React.memo(({ data }) => {                    │ │
│  │   return <div>{data}</div>;                                        │ │
│  │ });                                                                │ │
│  │ ```                                                                │ │
│  │ [🌟 Star] [📝 Copy] [👁️ Hide]                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 👤 User                                                            │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ What about useMemo vs useCallback?                                │ │
│  │ [👁️ Visible]                                                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│                              [Load more...]                              │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  [💾 Save View] [📤 Export] [🏷️ Categorize] [🗑️ Delete] [⚙️ Settings]   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Features:**

#### Message Controls (per message)
- **Visibility Toggle**: Show/Hide individual messages
- **Star/Pin**: Mark important messages
- **Copy**: Copy to clipboard
- **Share**: Generate shareable link to specific message
- **Export**: Export single message

#### View Modes
- **Full View**: All messages (respecting hidden ones)
- **Summary View**: Only user questions + starred responses
- **Code View**: Only code blocks
- **Reading View**: Clean, distraction-free reading

#### Display Options
- **Theme**: Light/Dark/Sepia
- **Font Size**: 12px - 20px
- **Line Height**: Compact/Normal/Relaxed
- **Code Highlighting**: 10+ themes
- **Math Rendering**: KaTeX support

---

### 4. Category System (Browser-Style Tab Groups)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🏷️ Manage Categories                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Create Category:                                                        │
│  ┌───────────────────────┐ ┌──────────┐ [+ Add]                        │
│  │ Category Name         │ │ 🔴 Color │                                 │
│  └───────────────────────┘ └──────────┘                                 │
│                                                                          │
│  Existing Categories:                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🔴 Work Projects        45 chats    [Edit] [🗑️]                   │   │
│  │ 🔵 Personal             23 chats    [Edit] [🗑️]                   │   │
│  │ 🟢 Ideas & Notes        12 chats    [Edit] [🗑️]                   │   │
│  │ 🟡 Learning             67 chats    [Edit] [🗑️]                   │   │
│  │ 🟣 Creative Writing      8 chats    [Edit] [🗑️]                   │   │
│  │ ⚪ Uncategorized       892 chats    [Edit] [🗑️]                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  🎨 Custom Colors                                                        │
│  [🔴] [🟠] [🟡] [🟢] [🔵] [🟣] [⚫] [⚪] [Custom 🎨]                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- 8 preset colors + custom color picker
- Drag-and-drop categorization
- Bulk categorization (select multiple chats)
- Smart categorization suggestions (AI-powered)
- Category icons (50+ options)
- Nested categories (sub-categories)

---

### 5. Third-Party Integrations

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🔗 Export to External Services                                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Note-Taking Apps                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 📝 Notion                    [Connect] [Export 12 selected]      │   │
│  │    Last export: 2 days ago                                       │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │ 🌳 Workflowy                 [Connect] [Export 12 selected]      │   │
│  │    Not connected                                                 │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │ 🐻 Obsidian                  [Connect] [Export 12 selected]      │   │
│  │    Last export: 5 hours ago                                      │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │ 📓 Logseq                    [Connect] [Export 12 selected]      │   │
│  │    Not connected                                                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Developer Tools                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🐙 GitHub Gists              [Connect] [Create Gist]             │   │
│  │ 📊 JSON CSV Export           [Export]                            │   │
│  │ 🗄️ SQLite Database           [Export]                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Cloud Storage                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ☁️ Google Drive             [Connect] [Sync]                     │   │
│  │ 📦 Dropbox                  [Connect] [Sync]                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Integration Details

**Notion:**
- Create database or append to existing
- Preserve formatting (headings, lists, code blocks)
- Tag support
- Create separate pages for each chat

**Workflowy:**
- Bullet-style export
- Nested structure preserved
- Tags as Workflowy tags

**Obsidian:**
- Markdown with YAML frontmatter
- Wikilinks support
- Tag as #chatgpt-archive
- Daily notes integration

**GitHub Gists:**
- Public/Private option
- Multiple files per gist
- Syntax highlighting

---

### 6. Search Interface

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🔍 Advanced Search                                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search all conversations...                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Filters:                                                                │
│  📅 Date: [All time ▼]  🏷️ Category: [All ▼]  🤖 Model: [All ▼]       │
│                                                                          │
│  Search In:                                                              │
│  ☑️ Titles  ☑️ User messages  ☑️ AI responses  ☑️ Code blocks        │
│                                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                          │
│  12 results for "react optimization"                                     │
│                                                                          │
│  🔴 React Component Optimization                                         │
│  "How can I optimize React rendering with useMemo..."                   │
│  📅 Jan 15, 2026 • 👤 3 user messages • 🤖 3 AI responses               │
│  [View] [Export]                                                         │
│                                                                          │
│  🔵 Personal Portfolio Website                                           │
│  "Help me optimize the React portfolio you helped me build..."          │
│  📅 Jan 10, 2026 • 👤 8 user messages • 🤖 8 AI responses               │
│  [View] [Export]                                                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Search Features:**
- Full-text search across all archived chats
- Fuzzy matching
- Regex support (advanced mode)
- Filter by date range, category, model
- Search within code blocks only
- Saved searches
- Search history

---

### 7. Settings Panel

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ⚙️ Settings                                                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🔒 Security                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ PIN Protection:        [● Enabled]                               │   │
│  │ Auto-lock after:       [5 minutes ▼]                             │   │
│  │ Biometric unlock:      [○ Disabled]                              │   │
│  │ Export encryption:     [● Enabled]                               │   │
│  │ [Change PIN]                                                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  💾 Backup & Storage                                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Storage used:          245 MB                                    │   │
│  │ Compression:           [● Enabled]                               │   │
│  │ Auto-backup:           [○ Disabled]                              │   │
│  │ Cloud sync:            [○ Disabled]                              │   │
│  │ [Export All] [Import] [Clear All]                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  🎨 Appearance                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Default theme:         [Dark ▼]                                  │   │
│  │ Font:                  [System ▼]                                │   │
│  │ Code theme:            [Dracula ▼]                               │   │
│  │ Show timestamps:       [● Yes]                                   │   │
│  │ Compact mode:          [○ No]                                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  🔧 Advanced                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Rate limit delay:      [1000ms ▼]                                │   │
│  │ Include system msgs:   [○ No]                                    │   │
│  │ Auto-categorize:       [● Enabled]                               │   │
│  │ Keyboard shortcuts:    [View]                                    │   │
│  │ [Reset to Defaults]                                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Storage Architecture

```
LocalStorage (encrypted):
├── settings/
│   ├── pin_hash
│   ├── theme
│   ├── categories
│   └── integrations
├── archives/
│   ├── metadata/ (indexed for search)
│   └── conversations/ (compressed)
├── search_index/ (lunr.js)
└── cache/
```

### Security

- **Encryption**: AES-256-GCM for stored data
- **Key Derivation**: PBKDF2 with 100k iterations
- **PIN Storage**: bcrypt hash only
- **Memory**: Clear sensitive data after use

### Performance

- **Virtual Scrolling**: For large conversation lists
- **Lazy Loading**: Load messages on demand
- **Web Workers**: Search indexing in background
- **Compression**: LZ4 for stored data

---

## User Flows

### First-Time Setup

1. Install extension
2. Welcome screen with feature tour
3. Set up PIN (optional but recommended)
4. Import existing backup or start fresh
5. Configure default categories

### Daily Usage

1. Click extension icon → Side panel opens
2. Enter PIN (if set)
3. Search or browse archives
4. Click conversation → Full viewer opens
5. Read, edit visibility, categorize
6. Export to external service (optional)

### Backup Flow

1. Click "Backup Now" in popup
2. Extension scrolls ChatGPT sidebar
3. Fetches conversations with progress
4. Encrypts and stores locally
5. Shows completion summary

---

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader optimized
- High contrast mode
- Font size adjustment
- Focus indicators

---

## Responsive Design

| Viewport | Layout |
|----------|--------|
| < 400px | Stacked, single column |
| 400-800px | Side panel |
| > 800px | Split view (sidebar + content) |
| Fullscreen | Maximum content width |

---

*Design Spec v1.0 - February 2026*
