# Chrome Web Store Assets

This directory contains HTML mockups for Chrome Web Store listing assets.

## Files

### Screenshots (1280x800)

| File | Description |
|------|-------------|
| `screenshot-pin.html` | PIN protection screen |
| `screenshot-archive.html` | Main archive viewer with sidebar |
| `screenshot-export.html` | Export modal with integrations |

### Promo Tiles

| File | Size | Description |
|------|------|-------------|
| `promo-small.html` | 440x280 | Small promo tile |
| `promo-large.html` | 920x680 | Large promo tile |
| `promo-marquee.html` | 1400x560 | Marquee promo tile |

## Converting HTML to Images

### Option 1: Browser Screenshot (Easiest)

1. Open each HTML file in a web browser
2. Use browser dev tools (F12) to ensure exact dimensions:
   - Screenshots: 1280x800
   - Small promo: 440x280
   - Large promo: 920x680
   - Marquee: 1400x560
3. Take screenshot using:
   - **Windows**: Snipping Tool or Win+Shift+S
   - **Mac**: Cmd+Shift+4
   - **Browser extension**: Full Page Screen Capture

### Option 2: Playwright/Puppeteer Script

```bash
npm install playwright
```

Create `capture.js`:
```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const files = [
    { name: 'screenshot-pin', width: 1280, height: 800 },
    { name: 'screenshot-archive', width: 1280, height: 800 },
    { name: 'screenshot-export', width: 1280, height: 800 },
    { name: 'promo-small', width: 440, height: 280 },
    { name: 'promo-large', width: 920, height: 680 },
    { name: 'promo-marquee', width: 1400, height: 560 },
  ];
  
  for (const file of files) {
    await page.setViewportSize({ width: file.width, height: file.height });
    await page.goto(`file://${__dirname}/${file.name}.html`);
    await page.screenshot({ 
      path: `${file.name}.png`,
      type: 'png'
    });
    console.log(`Captured ${file.name}.png`);
  }
  
  await browser.close();
})();
```

Run:
```bash
node capture.js
```

### Option 3: Online HTML to Image Converter

Use tools like:
- https://html2canvas.hertzen.com/
- https://www.screenshotmachine.com/

## Chrome Web Store Requirements

- **Screenshots**: Minimum 1280x800, maximum 1280x800 (recommended)
  - Format: PNG or JPEG
  - At least 1, up to 10
  
- **Small Promo Tile**: 440x280
  - Format: PNG or JPEG
  - Optional but recommended
  
- **Large Promo Tile**: 920x680
  - Format: PNG or JPEG
  - Optional
  
- **Marquee Promo Tile**: 1400x560
  - Format: PNG or JPEG
  - Optional, used for featured placement

## Tips

1. Use PNG for better quality (especially for text)
2. Keep file sizes under recommended limits
3. Test how screenshots look in the store layout
4. First screenshot is most important - make it count!
