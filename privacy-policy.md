# Privacy Policy

## ChatGPT Archive Extension

**Effective Date:** March 1, 2026  
**Last Updated:** March 9, 2026

---

### Overview

ChatGPT Archive is committed to protecting your privacy. This privacy policy explains how we handle your data in compliance with the Chrome Web Store Developer Program Policies and global privacy regulations including GDPR and CCPA.

---

### Data Collection

**We collect ZERO personal data.**

This extension:
- ✅ Stores your ChatGPT conversations locally on your device only
- ✅ Uses AES-256 encryption with a PIN you choose
- ✅ Never sends your data to any external servers
- ✅ Never tracks your usage or behavior
- ✅ Never uses analytics or telemetry
- ✅ Does not use cookies or tracking pixels

**What we DO NOT collect:**
- No personally identifiable information
- No financial or payment information
- No health information
- No authentication credentials (we don't have access to your ChatGPT login)
- No browsing history
- No location data
- No IP addresses

---

### Data Storage

All data is stored:
- **Location:** Your browser's local storage only (never leaves your device)
- **Encryption:** AES-256-GCM with your PIN-derived key via PBKDF2 (100,000 iterations)
- **Access:** Only you, with your PIN
- **Transmission:** None - no network requests with your data

---

### Data Retention and Deletion

**Retention Period:**
- Your data is stored indefinitely on your local device until you choose to delete it
- We do not have access to your data and cannot delete it on your behalf

**How to Delete Your Data:**
You have complete control over your data:
1. **Delete individual conversations:** Use the "Delete" option in the archive viewer
2. **Delete all data:** Open the extension, go to Settings → "Delete All Data"
3. **Uninstall the extension:** This removes all stored data from your browser
4. **Clear browser storage:** You can also clear `chrome.storage.local` via browser settings

---

### Accessing and Correcting Your Data

Since all data is stored locally on your device:
- **Access:** Open the extension and enter your PIN to view all archived conversations
- **Correction:** You can edit conversation metadata (categories, visibility settings) within the app
- **Export:** You can export your data in multiple formats (JSON, Markdown, HTML, PDF)

---

### Permissions

We request these permissions solely for functionality:

| Permission | Purpose |
|------------|---------|
| **activeTab** | To access ChatGPT page content for backup (only when you click "New Backup") |
| **storage** | To store your encrypted archive locally in browser storage |
| **downloads** | To export your conversations to files on your computer |
| **sidePanel** | To provide a persistent archive viewer interface |

---

### Third-Party Services

Optional integrations (only when you explicitly choose to export):

| Service | Data Shared | When |
|---------|-------------|------|
| **Notion API** | Conversation content you select | Only when you click "Export to Notion" |

**Note:** Third-party services have their own privacy policies. Data is only transmitted when you explicitly initiate an export action. We never send data to any service without your direct action.

---

### Security Measures

We implement industry-standard security:
- **Encryption at rest:** AES-256-GCM encryption
- **Key derivation:** PBKDF2 with 100,000 iterations
- **PIN protection:** 4-6 digit PIN required for access
- **Auto-lock:** Optional automatic lock after period of inactivity
- **No remote servers:** Eliminates server-side data breach risk
- **Open source:** Code is auditable by security researchers

---

### Children's Privacy

This extension is not intended for use by children under 13. We do not knowingly collect any personal information from children.

---

### Open Source

Our code is open source and available for audit:
https://github.com/EndemicMedia/chatgpt-archive

---

### Changes to This Policy

We will update this policy if our practices change. Changes will be:
- Posted on this page with an updated "Last Updated" date
- Summarized in our GitHub repository releases
- Not significant given our zero-data-collection approach

---

### Contact Us

For privacy questions, data access requests, or concerns:

**Email:** support@endemicmedia.com  
**GitHub Issues:** https://github.com/EndemicMedia/chatgpt-archive/issues

We aim to respond to all privacy-related inquiries within 30 days.

---

### Compliance

This privacy policy complies with:
- Chrome Web Store Developer Program Policies
- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- CalOPPA (California Online Privacy Protection Act)

---

*This privacy policy is provided in addition to the data disclosure information submitted in the Chrome Web Store Developer Dashboard.*
