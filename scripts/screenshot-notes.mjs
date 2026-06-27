import Database from "better-sqlite3";
import { chromium } from "playwright";

const PREFIX = "njtech:202321144057";

const db = new Database("./data/scholarflow.db");

async function run() {
  // 备份真实凭证，避免测试过程误伤用户登录态
  const credentialBackup = db
    .prepare("SELECT school_id, user_id, credential_data, expires_at, created_at FROM credentials")
    .all();
  db.prepare("DELETE FROM credentials").run();
  db.prepare(
    "INSERT INTO credentials (school_id, user_id, credential_data, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run("njtech", "202321144057", JSON.stringify({ username: "202321144057" }), null, Date.now());

  const browser = await chromium.launch({ headless: true });

  try {
    for (const vp of [
      { name: "desktop", width: 1280, height: 900 },
      { name: "mobile", width: 390, height: 844 },
    ]) {
      const notePath = "Calculus-Review.md";
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

        await page
          .goto("http://localhost:3000/notes", {
            waitUntil: "networkidle",
            timeout: 20000,
          })
          .catch(() => {});
        await page.waitForTimeout(1500);

        // 一键新建空白笔记
        await page.getByRole("button", { name: "新建笔记" }).first().click();
        await page.waitForSelector('input[placeholder="无标题笔记"]:visible', { timeout: 5000 });

        // 直接重命名为目标标题
        await page.fill('input[placeholder="无标题笔记"]:visible', "Calculus Review");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(600);

        // 等待 WYSIWYG 编辑器渲染并聚焦
        const editor = page.locator('[contenteditable="true"]:visible').first();
        await editor.waitFor({ timeout: 5000 });
        await page.waitForTimeout(800);

        // 输入格式化内容：使用 Tiptap 输入规则 "- " 自动生成无序列表
        await editor.click();
        await page.keyboard.type("- Limit definition");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Derivative formulas");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Integration by substitution");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Remember to practice!");

        await page.waitForTimeout(800);

        await page.screenshot({
          path: `screenshots/notes-edit-${vp.name}.png`,
          fullPage: true,
        });
        console.log("✓ screenshots/notes-edit-" + vp.name + ".png");

        // 切换到预览
        await page.getByRole("button", { name: "预览" }).first().click();
        await page.waitForSelector('h1:has-text("Calculus Review"):visible', { timeout: 5000 });
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
  } finally {
    // 清理测试凭证并还原真实凭证
    db.prepare("DELETE FROM credentials").run();
    const insert = db.prepare(
      "INSERT INTO credentials (school_id, user_id, credential_data, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    for (const row of credentialBackup) {
      insert.run(row.school_id, row.user_id, row.credential_data, row.expires_at, row.created_at);
    }
    await browser.close();
  }
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });
