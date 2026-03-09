const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  
  // Helper function to capture at exact dimensions
  async function captureExact(page, file, width, height) {
    // Create a new context with specific viewport and deviceScaleFactor
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1  // Force 1:1 pixel ratio
    });
    const p = await context.newPage();
    
    await p.goto(`file://${path.join(__dirname, file)}`);
    await p.screenshot({ 
      path: file.replace('.html', '.png'),
      fullPage: false  // Capture viewport only
    });
    await context.close();
    console.log(`✅ Created ${file.replace('.html', '.png')} (${width}x${height})`);
  }
  
  const page = await browser.newPage();
  
  // Screenshots (1280x800)
  const screenshots = [
    { file: 'screenshot-pin.html', width: 1280, height: 800 },
    { file: 'screenshot-archive.html', width: 1280, height: 800 },
    { file: 'screenshot-export.html', width: 1280, height: 800 },
    { file: 'screenshot-categories.html', width: 1280, height: 800 },
    { file: 'screenshot-search.html', width: 1280, height: 800 }
  ];
  
  for (const { file, width, height } of screenshots) {
    await captureExact(page, file, width, height);
  }
  
  // Promo tiles
  const promos = [
    { file: 'promo-small.html', width: 440, height: 280 },
    { file: 'promo-large.html', width: 920, height: 680 },
    { file: 'promo-marquee.html', width: 1400, height: 560 }
  ];
  
  for (const { file, width, height } of promos) {
    await captureExact(page, file, width, height);
  }
  
  // Store icon (128x128)
  await captureExact(page, 'icon-store.html', 128, 128);
  
  await browser.close();
  console.log('\n🎉 All store assets generated successfully!');
})();
