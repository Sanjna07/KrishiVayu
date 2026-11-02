const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verify() {
  const artifactDir = 'C:\\Users\\amitg\\.gemini\\antigravity\\brain\\d09a8de6-2c9e-4613-a046-cebf32eccbd3';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for headline metrics to populate
  await page.waitForSelector('text=Hotspots Detected', { timeout: 15000 });
  await page.waitForTimeout(2000); // Allow map tiles and canvas to settle

  const desktopScreenshot = path.join(artifactDir, 'desktop-1440.png');
  await page.screenshot({ path: desktopScreenshot });
  console.log('Saved desktop screenshot:', desktopScreenshot);

  // Click district item to test selection sync & drawer
  console.log('Clicking top ranked district item...');
  const firstDistrict = page.locator('aside div[class*="cursor-pointer"]').first();
  await firstDistrict.click();
  await page.waitForTimeout(1000);

  const drawerScreenshot = path.join(artifactDir, 'drawer-open.png');
  await page.screenshot({ path: drawerScreenshot });
  console.log('Saved drawer screenshot:', drawerScreenshot);

  // Test copy button
  console.log('Testing Copy Farmer Message button...');
  const copyBtn = page.locator('button:has-text("Copy Farmer Message")');
  if (await copyBtn.isVisible()) {
    await copyBtn.click();
    await page.waitForTimeout(500);
    const copiedText = await page.locator('text=Copied Advisory!').isVisible();
    console.log('Copy button feedback active:', copiedText);
  }

  // Test language switcher to Punjabi
  console.log('Testing Punjabi language switcher...');
  const paBtn = page.locator('button:has-text("ਪੰਜਾਬੀ")');
  if (await paBtn.isVisible()) {
    await paBtn.click();
    await page.waitForTimeout(500);
    const textareaVal = await page.locator('textarea').inputValue();
    console.log('Punjabi text generated in textarea:', textareaVal.slice(0, 50) + '...');
  }

  // Mobile viewport test (390px)
  console.log('Testing mobile viewport 390x844...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);

  const mobileScreenshot = path.join(artifactDir, 'mobile-390.png');
  await page.screenshot({ path: mobileScreenshot });
  console.log('Saved mobile screenshot:', mobileScreenshot);

  await browser.close();
  console.log('ALL PLAYWRIGHT UI VERIFICATIONS COMPLETE!');
}

verify().catch((err) => {
  console.error('Playwright verification error:', err);
  process.exit(1);
});
