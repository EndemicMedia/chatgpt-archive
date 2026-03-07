# Store Submission Checklist

## Pre-Submission Verification

### ✅ Code & Tests
- [x] All unit tests passing (129 tests)
- [x] Extension builds successfully
- [x] Icons generated (16, 32, 48, 128 PNG)
- [x] No console errors during build

### ✅ Chrome Web Store Requirements

#### Package
- [x] Manifest V3 valid
- [x] Icons included
- [x] Under 4MB size limit (79.66 kB ✓)
- [x] No remote code

#### Store Listing
- [x] Title (max 75 chars): `ChatGPT Archive - Secure Backup & Offline Viewer`
- [x] Short description (max 132 chars): See STORE_LISTING.md
- [x] Detailed description: See STORE_LISTING.md
- [x] Category: Productivity
- [x] Keywords: chatgpt backup export archive notion obsidian pin secure encryption offline viewer categorize organize json markdown html

#### Privacy & Compliance
- [x] Privacy policy: See PRIVACY.md
- [x] Single purpose: Backup and view ChatGPT conversations
- [x] Permission justification:
  - `activeTab`: Read ChatGPT conversations for backup
  - `storage`: Store encrypted archive locally
  - `downloads`: Export conversations to files
  - `sidePanel`: Display archive viewer

#### Screenshots Required (1280x800 or 640x400)
- [ ] Screenshot 1: PIN lock screen
- [ ] Screenshot 2: Archive viewer with categories
- [ ] Screenshot 3: Search functionality
- [ ] Screenshot 4: Export integrations
- [ ] (Optional) Promotional tile: 1400x560 or 440x280

### ✅ Firefox Add-ons Requirements

- [x] Manifest V2 compatible (use `npm run build:firefox`)
- [x] Same privacy policy applies
- [x] Source code included (if minified/obfuscated)

## Build Commands

```bash
# Generate icons
npm run generate-icons

# Build for Chrome
npm run build

# Build for Firefox
npm run build:firefox

# Package for Chrome Web Store
cd .output/chrome-mv3
zip -r ../../chatgpt-archive-1.0.0.zip .

# Package for Firefox
cd .output/firefox-mv2
zip -r ../../chatgpt-archive-1.0.0-firefox.zip .
```

## Upload URLs

- Chrome Web Store: https://chrome.google.com/webstore/devconsole
- Firefox Add-ons: https://addons.mozilla.org/developers/

## Post-Submission

- [ ] Verify extension installs correctly from store
- [ ] Test backup functionality on chatgpt.com
- [ ] Test viewer with existing backups
- [ ] Monitor reviews for issues

## Notes

- Chrome review typically takes 1-3 business days
- Firefox review can take up to several weeks for new extensions
- Keep screenshots ready before submission
- Have a support email ready for user inquiries
