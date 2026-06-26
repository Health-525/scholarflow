import Database from "better-sqlite3";
import { chromium } from "playwright";

const PREFIX = "njtech:202321144057";

const db = new Database("./data/scholarflow.db");

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const vp of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const notePath = "Math/Calculus-Review.md";
    const noteKey = `note:${PREFIX}:${notePath}`;

    const context = await browser.newContext({ viewport: vp });
    await context.addInitScript(() => {
      localStorage.setItem(
        "sf_auth",
        JSON.stringify({
          state: {
            schoolId: "njtech",
            userId: "202321144057",
            username: "202321144057",
            isAuthenticated: true,
            _hasHydrated: false,
          },
          version: 0,
        })
      );
    });
    const page = await context.newPage();

    await page.route("/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: true,
          schoolId: "njtech",
          userId: "202321144057",
          username: "202321144057",
        }),
      });
    });

    try {
      // 先清理同路径旧笔记，防止 409
      db.prepare("DELETE FROM data_store WHERE key = ?").run(noteKey);

      await page.goto("http://localhost:3000/notes", {
        waitUntil: "networkidle",
        timeout: 20000,
      }).catch(() => {});
      await page.waitForTimeout(1500);

      // 进入新建便签
      await page.getByRole("button", { name: "新建笔记" }).first().click();
      await page.waitForSelector('form input[placeholder="标题"]:visible', { timeout: 5000 });

      await page.fill('form input[placeholder="标题"]:visible', "Calculus Review");
      await page.fill('form input[placeholder="分类（可选）"]:visible', "Math");
      await page.fill('form textarea[placeholder="从这里开始写…"]:visible', "# Calculus Review\n\n- Limit definition\n- Derivative formulas\n- Integration by substitution\n\n**Remember to practice!**");

      await page.getByRole("button", { name: "创建便签" }).first().click();

      // 等待进入编辑态
      await page.waitForSelector('textarea[placeholder="写点什么…"]:visible', { timeout: 5000 });
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `screenshots/notes-edit-${vp.name}.png`,
        fullPage: true,
      });
      console.log("✓ screenshots/notes-edit-" + vp.name + ".png");

      // 切换到预览
      await page.getByRole("button", { name: "预览" }).first().click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `screenshots/notes-preview-${vp.name}.png`,
        fullPage: true,
      });
      console.log("✓ screenshots/notes-preview-" + vp.name + ".png");
    } finally {
      db.prepare("DELETE FROM data_store WHERE key = ?").run(noteKey);
      await context.close();
    }
  }

  await browser.close();
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });
