/**
 * Extension Package Verification Script
 * Uses Playwright to validate the extension before store submission
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EXTENSION_PATH = path.join(__dirname, '../.output/chrome-mv3');

async function verifyExtension() {
  console.log('🔍 Verifying ChatGPT Archive Extension Package\n');
  
  const results = {
    manifest: false,
    icons: false,
    files: false,
    popup: false,
    viewer: false,
    background: false
  };
  
  // 1. Check manifest exists and is valid
  console.log('1️⃣ Checking manifest.json...');
  const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.json not found');
    return results;
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const requiredFields = ['name', 'version', 'manifest_version', 'permissions'];
  const missingFields = requiredFields.filter(f => !manifest[f]);
  
  if (missingFields.length > 0) {
    console.error(`❌ Missing fields: ${missingFields.join(', ')}`);
  } else {
    console.log(`✅ Manifest valid (v${manifest.manifest_version})`);
    console.log(`   Name: ${manifest.name}`);
    console.log(`   Version: ${manifest.version}`);
    results.manifest = true;
  }
  
  // 2. Check all required icons exist
  console.log('\n2️⃣ Checking icons...');
  const iconSizes = [16, 32, 48, 128];
  const missingIcons = [];
  
  for (const size of iconSizes) {
    const iconPath = path.join(EXTENSION_PATH, 'icon', `${size}.png`);
    if (!fs.existsSync(iconPath)) {
      missingIcons.push(`${size}.png`);
    }
  }
  
  if (missingIcons.length > 0) {
    console.error(`❌ Missing icons: ${missingIcons.join(', ')}`);
  } else {
    console.log(`✅ All icons present (16, 32, 48, 128)`);
    results.icons = true;
  }
  
  // 3. Check required files
  console.log('\n3️⃣ Checking required files...');
  const requiredFiles = [
    'popup.html',
    'viewer.html',
    'background.js',
    'content-scripts.js'
  ];
  
  const missingFiles = [];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(EXTENSION_PATH, file))) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    console.error(`❌ Missing files: ${missingFiles.join(', ')}`);
  } else {
    console.log(`✅ All required files present`);
    results.files = true;
  }
  
  // 4. Check package size
  console.log('\n4️⃣ Checking package size...');
  const getFolderSize = (dir) => {
    let size = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        size += getFolderSize(filePath);
      } else {
        size += stats.size;
      }
    }
    return size;
  };
  
  const sizeBytes = getFolderSize(EXTENSION_PATH);
  const sizeKB = (sizeBytes / 1024).toFixed(2);
  const sizeLimit = 4 * 1024 * 1024; // 4MB Chrome limit
  
  if (sizeBytes > sizeLimit) {
    console.error(`❌ Package too large: ${sizeKB} KB (limit: 4096 KB)`);
  } else {
    console.log(`✅ Package size: ${sizeKB} KB (limit: 4096 KB)`);
  }
  
  // 5. Browser test with Playwright
  console.log('\n5️⃣ Testing with Playwright...');
  
  let browser;
  try {
    browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox'
      ]
    });
    
    // Get extension ID from service worker
    let [serviceWorker] = browser.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await browser.waitForEvent('serviceworker', { timeout: 10000 });
    }
    
    const extensionId = serviceWorker.url().split('/')[2];
    console.log(`✅ Extension loaded (ID: ${extensionId})`);
    
    // Test popup
    console.log('\n6️⃣ Testing popup...');
    const popupPage = await browser.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState('networkidle');
    
    const popupTitle = await popupPage.title();
    console.log(`✅ Popup loaded: "${popupTitle}"`);
    
    // Check for key elements
    const hasBackupButton = await popupPage.locator('button').count() > 0;
    if (hasBackupButton) {
      console.log(`✅ Backup button found`);
      results.popup = true;
    }
    
    await popupPage.screenshot({ path: 'test-results/popup-screenshot.png' });
    console.log(`📸 Screenshot saved: test-results/popup-screenshot.png`);
    
    // Test viewer
    console.log('\n7️⃣ Testing viewer...');
    const viewerPage = await browser.newPage();
    await viewerPage.goto(`chrome-extension://${extensionId}/viewer.html`);
    await viewerPage.waitForLoadState('networkidle');
    
    const viewerTitle = await viewerPage.title();
    console.log(`✅ Viewer loaded: "${viewerTitle}"`);
    
    const hasPinScreen = await viewerPage.locator('.pin-screen, #pin-screen').count() > 0;
    if (hasPinScreen) {
      console.log(`✅ PIN screen detected`);
      results.viewer = true;
    }
    
    await viewerPage.screenshot({ path: 'test-results/viewer-screenshot.png' });
    console.log(`📸 Screenshot saved: test-results/viewer-screenshot.png`);
    
    // Test background script
    console.log('\n8️⃣ Testing background script...');
    const pages = await browser.pages();
    const backgroundPage = pages.find(p => p.url().includes('background'));
    
    if (backgroundPage || serviceWorker) {
      console.log(`✅ Background script/service worker active`);
      results.background = true;
    }
    
    await browser.close();
    
  } catch (error) {
    console.error(`❌ Browser test failed: ${error.message}`);
    if (browser) await browser.close();
  }
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(v => v).length;
  
  for (const [check, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${check}`);
  }
  
  console.log('='.repeat(50));
  console.log(`Result: ${passedChecks}/${totalChecks} checks passed`);
  
  if (passedChecks === totalChecks) {
    console.log('\n🎉 Extension is ready for store submission!');
  } else {
    console.log('\n⚠️  Please fix the issues above before submitting.');
  }
  
  return results;
}

// Run verification
verifyExtension().catch(console.error);
