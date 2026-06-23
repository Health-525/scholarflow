/**
 * @vitest-environment node
 *
 * electron/activity-categorize.js 单元测试
 *
 * 验证应用名称规范化与窗口分类规则。
 */
import { describe, expect, it } from "vitest";

const { categorizeActivity } = require("../electron/activity-categorize");

describe("activity-categorize", () => {
  it("Visual Studio Code → coding，app 名为 VS Code", () => {
    const result = categorizeActivity("Visual Studio Code", "project - Visual Studio Code");
    expect(result.app).toBe("VS Code");
    expect(result.category).toBe("coding");
    expect(result.project).toBe("project");
  });

  it("Chrome 窗口标题含 github.com → coding", () => {
    const result = categorizeActivity("Google Chrome", "repo - github.com - Chrome");
    expect(result.app).toBe("Chrome");
    expect(result.category).toBe("coding");
    expect(result.domain).toBe("github.com");
  });

  it("Chrome 窗口标题含 bilibili.com → entertainment", () => {
    const result = categorizeActivity("Google Chrome", "video - bilibili.com - Chrome");
    expect(result.app).toBe("Chrome");
    expect(result.category).toBe("entertainment");
    expect(result.domain).toBe("bilibili.com");
  });

  it("微信 → communication，app 名为 微信", () => {
    const result = categorizeActivity("微信", "微信");
    expect(result.app).toBe("微信");
    expect(result.category).toBe("communication");
  });

  it("文件资源管理器 → system", () => {
    const result = categorizeActivity("文件资源管理器", "下载");
    expect(result.app).toBe("文件管理");
    expect(result.category).toBe("system");
  });

  it("未知应用保留原始名，category 为 other", () => {
    const result = categorizeActivity("MyUnknownTool", "Some Window");
    expect(result.app).toBe("MyUnknownTool");
    expect(result.category).toBe("other");
  });

  it("VS Code Insiders → coding，app 名为 VS Code", () => {
    const result = categorizeActivity("Visual Studio Code - Insiders", "project - Visual Studio Code - Insiders");
    expect(result.app).toBe("VS Code");
    expect(result.category).toBe("coding");
  });

  it("Cursor → coding，app 名为 Cursor", () => {
    const result = categorizeActivity("Cursor", "main.ts - Cursor");
    expect(result.app).toBe("Cursor");
    expect(result.category).toBe("coding");
  });

  it("钉钉 → communication，app 名为钉钉", () => {
    const result = categorizeActivity("钉钉", "工作通知 - 钉钉");
    expect(result.app).toBe("钉钉");
    expect(result.category).toBe("communication");
  });

  it("QQ → communication，app 名为 QQ", () => {
    const result = categorizeActivity("QQ", "QQ");
    expect(result.app).toBe("QQ");
    expect(result.category).toBe("communication");
  });

  it("Photoshop → study，app 名为 Photoshop", () => {
    const result = categorizeActivity("Adobe Photoshop", "Untitled - Photoshop");
    expect(result.app).toBe("Photoshop");
    expect(result.category).toBe("study");
  });

  it("文件资源管理器 → system，app 名为文件管理", () => {
    const result = categorizeActivity("文件资源管理器", "下载");
    expect(result.app).toBe("文件管理");
    expect(result.category).toBe("system");
  });
});
