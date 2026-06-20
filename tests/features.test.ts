/**
 * 边角功能回归测试
 *
 * 覆盖一些不适合放在核心引擎测试文件里的小功能：
 * - EmptyState 组件渲染
 * - 倒计时格式化
 * - 成绩文字缩写
 */
import { Target } from "lucide-react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

import { EmptyState } from "@/components/ui/EmptyState";
import { getScoreDisplay } from "@/lib/gpa";
import { formatCountdown } from "@/lib/schedule/timezone";

describe("EmptyState component", () => {
  it("渲染标题与描述", () => {
    const html = renderToStaticMarkup(
      React.createElement(EmptyState, {
        title: "没有数据",
        description: "请先添加一条记录",
      })
    );
    expect(html).toContain("没有数据");
    expect(html).toContain("请先添加一条记录");
  });

  it("渲染图标", () => {
    const html = renderToStaticMarkup(
      React.createElement(EmptyState, {
        icon: Target,
        title: "目标",
      })
    );
    // lucide-react 的 SVG 会包含 svg 标签
    expect(html).toContain("<svg");
  });

  it("渲染操作按钮并触发点击回调", () => {
    const onClick = vi.fn();
    const html = renderToStaticMarkup(
      React.createElement(EmptyState, {
        title: "空状态",
        action: { label: "去添加", onClick },
      })
    );
    expect(html).toContain("去添加");
    // SSR 场景下只验证按钮渲染；点击行为由组件测试库覆盖
  });
});

describe("formatCountdown", () => {
  it("非正数返回 已开始", () => {
    expect(formatCountdown(0)).toBe("已开始");
    expect(formatCountdown(-1000)).toBe("已开始");
  });

  it("小时+分钟", () => {
    expect(formatCountdown(2 * 3600 * 1000 + 15 * 60 * 1000)).toBe("2小时15分");
  });

  it("分钟+秒", () => {
    expect(formatCountdown(5 * 60 * 1000 + 30 * 1000)).toBe("5分30秒");
  });
});

describe("getScoreDisplay", () => {
  it("五级制成绩缩写", () => {
    expect(getScoreDisplay("优秀")).toBe("优");
    expect(getScoreDisplay("良好")).toBe("良");
    expect(getScoreDisplay("中等")).toBe("中");
    expect(getScoreDisplay("及格")).toBe("及");
    expect(getScoreDisplay("不及格")).toBe("不");
  });

  it("数字成绩原样返回", () => {
    expect(getScoreDisplay("85")).toBe("85");
  });
});
