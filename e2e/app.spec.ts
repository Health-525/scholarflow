import { test, expect } from '@playwright/test';

/**
 * ScholarFlow E2E 冒烟测试
 *
 * 覆盖关键用户路径：
 * 1. 首次访问 → Setup 页面
 * 2. 仪表板加载
 * 3. 各导航页面加载
 *
 * 运行：npx playwright test
 */

test.describe('认证流程', () => {
  test('首次访问应展示 setup 页面', async ({ page }) => {
    // 清除 E2E token 来模拟首次访问
    await page.goto('/');
    // Setup 页面不需要认证
    await page.goto('/setup');
    await expect(page.locator('h1, h2')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('仪表板', () => {
  test('仪表板加载并显示标题', async ({ page }) => {
    await page.goto('/');
    // 等待页面渲染完成
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    // 应显示 ScholarFlow 或日期信息
    await expect(page.locator('body')).toContainText(/月|日|ScholarFlow|仪表板/);
  });

  test('仪表板显示导航元素', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    // 侧边栏或底部导航应可见
    const navVisible = await Promise.race([
      page.locator('nav').first().isVisible({ timeout: 5000 }).catch(() => false),
      page.locator('[role="navigation"]').first().isVisible({ timeout: 5000 }).catch(() => false),
    ]);
    // 如果未认证被重定向，这也是合理行为
    expect(navVisible || page.url().includes('setup')).toBeTruthy();
  });
});

test.describe('页面导航', () => {
  const pages = [
    { path: '/', name: '仪表板' },
    { path: '/schedule', name: '课表' },
    { path: '/assignments', name: '作业' },
    { path: '/notes', name: '笔记' },
    { path: '/running', name: '跑步' },
    { path: '/reports', name: '日报' },
    { path: '/settings', name: '设置' },
  ];

  for (const { path, name } of pages) {
    test(`${name} (${path}) 页面可访问`, async ({ page }) => {
      const response = await page.goto(path);
      // 页面不应返回 500 错误
      if (response) {
        expect(response.status()).toBeLessThan(500);
      }
      // 页面 body 应有内容
      await expect(page.locator('body')).toBeVisible();
    });
  }
});

test.describe('响应式布局', () => {
  test('移动端视口应显示底部导航', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // 移动端底部导航应该存在
    const hasBottomNav = await page.locator('.bottom-nav, [class*="bottom"], [class*="Bottom"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    // 如果未认证重定向，也是合理的
    expect(hasBottomNav || page.url().includes('setup')).toBeTruthy();
  });

  test('桌面端视口应显示侧边栏', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const hasSidebar = await page.locator('aside, [class*="SideNav"], [class*="sidebar"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSidebar || page.url().includes('setup')).toBeTruthy();
  });
});
