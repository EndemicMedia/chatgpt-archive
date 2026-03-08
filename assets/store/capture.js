#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  
  const files = [
    { name: 'screenshot-pin', width: 1280, height: 800 },
    { name: 'screenshot-archive', width: 1280, height: 800 },
    { name: 'screenshot-export', width: 1280, height: 800 },
    { name: 'promo-small', width: 440, height: 280 },
    { name: 'promo-large', width: 920, height: 680 },
    { name: 'promo-marquee', width: 1400, height: 560 },
  ];
  
  for (const file of files) {
    console.log(`Capturing ${file.name}.html (${file.width}x${file.height})...`);
    
    const page = await browser.newPage({
      viewport: { width: file.width, height: file.height }
    });
    
    const htmlPath = path.join(__dirname, `${file.name}.html`);
    await page.goto(`file://${htmlPath}`);
    
    // Wait for fonts to load
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: `${file.name}.png`,
      type: 'png',
      fullPage: false
    });
    
    console.log(`✅ Created ${file.name}.png`);
    await page.close();
  }
  
  await browser.close();
  console.log('\n🎉 All screenshots captured successfully!');
})();
