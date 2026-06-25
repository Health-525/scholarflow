import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.route("/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        schoolId: "njtech",
        userId: "e2e-test-user",
        username: "e2e-test-user",
      }),
    });
  });

  const port = process.env.PORT || "3003";
  await page.goto(`http://localhost:${port}/settings`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "screenshots/settings-redesign.png", fullPage: true });
  await browser.close();
  console.log("Screenshot saved to screenshots/settings-redesign.png");
})();
