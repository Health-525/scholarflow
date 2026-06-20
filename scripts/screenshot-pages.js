const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  '/',
  '/schedule',
  '/assignments',
  '/goals',
  '/notes',
  '/exams',
  '/running',
  '/gpa',
  '/pomodoro',
  '/settings',
  '/library',
  '/activity',
  '/reports/daily',
  '/reports/weekly',
  '/setup',
];

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    for (const route of ROUTES) {
      try {
        await page.goto(`http://localhost:3000${route}`, { waitUntil: 'load', timeout: 15000 });
        await page.waitForTimeout(1200);
        const safe = route.replace(/\//g, '_') || 'home';
        const file = path.join(OUT, `${vp.name}-${safe}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log('✓', vp.name, route);
      } catch (e) {
        console.error('✗', vp.name, route, e.message);
      }
    }
    await context.close();
  }
  await browser.close();
  console.log('Done:', OUT);
})();
