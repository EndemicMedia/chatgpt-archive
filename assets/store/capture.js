const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
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
    await page.setViewportSize({ width, height });
    await page.goto(`file://${path.join(__dirname, file)}`);
    await page.screenshot({ 
      path: file.replace('.html', '.png'),
      fullPage: true 
    });
    console.log(`✅ Created ${file.replace('.html', '.png')}`);
  }
  
  // Promo tiles
  const promos = [
    { file: 'promo-small.html', width: 440, height: 280 },
    { file: 'promo-large.html', width: 920, height: 680 },
    { file: 'promo-marquee.html', width: 1400, height: 560 }
  ];
  
  for (const { file, width, height } of promos) {
    await page.setViewportSize({ width, height });
    await page.goto(`file://${path.join(__dirname, file)}`);
    await page.screenshot({ 
      path: file.replace('.html', '.png'),
      fullPage: true 
    });
    console.log(`✅ Created ${file.replace('.html', '.png')}`);
  }
  
  // Store icon (128x128) - no transparency
  await page.setViewportSize({ width: 128, height: 128 });
  await page.goto(`file://${path.join(__dirname, 'icon-store.html')}`);
  await page.screenshot({ 
    path: 'icon-store.png',
    fullPage: true
  });
  console.log(`✅ Created icon-store.png (128x128 store icon)`);
  
  await browser.close();
  console.log('\n🎉 All store assets generated successfully!');
  console.log('\nGenerated files:');
  console.log('- 5 screenshots (1280x800)');
  console.log('- 3 promo tiles (small/large/marquee)');
  console.log('- 1 store icon (128x128)');
})();
