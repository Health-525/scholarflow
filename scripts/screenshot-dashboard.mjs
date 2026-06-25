import { chromium } from "playwright";

const SCHOOL_ID = "njtech";
const USER_ID = "202321144057";

const AUTH_STATE = JSON.stringify({
  state: {
    schoolId: SCHOOL_ID,
    userId: USER_ID,
    username: USER_ID,
    isAuthenticated: true,
    _hasHydrated: false,
  },
  version: 0,
});

(async () => {
  const port = process.env.PORT || "3003";
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        schoolId: SCHOOL_ID,
        userId: USER_ID,
        username: USER_ID,
      }),
    });
  });

  await page.addInitScript((state) => {
    window.localStorage.setItem("sf_auth", state);
  }, AUTH_STATE);

  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const url = page.url();
  console.log("Current URL:", url);

  if (url.includes("/setup")) {
    console.error("Still on setup page, auth injection failed");
    await browser.close();
    process.exit(1);
  }

  await page.screenshot({ path: "screenshots/dashboard-redesign.png", fullPage: true });
  await browser.close();
  console.log("Screenshot saved to screenshots/dashboard-redesign.png");
})();
