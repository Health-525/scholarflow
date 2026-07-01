import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MorePage from "@/app/more/page";
import { MORE_PAGE_GROUPS, type NavItemConfig } from "@/config/navigation";

describe("MorePage", () => {
  // Feature: scholarflow-full-optimization, Property 12: MorePage 对任意 NavItemConfig 的渲染正确性
  it("Property 12: 渲染所有 MORE_PAGE_GROUPS 条目，含 description 时显示，无 description 时不报错", () => {
    render(<MorePage />);

    for (const group of MORE_PAGE_GROUPS) {
      expect(screen.getByText(group.label)).toBeInTheDocument();

      for (const item of group.items) {
        const links = screen.getAllByRole("link");
        const matching = links.find((link) =>
          link.textContent?.includes(item.label) && link.getAttribute("href") === item.href,
        );
        expect(matching).toBeTruthy();

        const expectedSubtitle = (item as NavItemConfig).description ?? "";
        if (expectedSubtitle) {
          expect(screen.getByText(expectedSubtitle)).toBeInTheDocument();
        }
      }
    }
  });

  it("开源仓库外部链接存在", () => {
    render(<MorePage />);
    expect(screen.getByRole("link", { name: /开源仓库/ })).toHaveAttribute(
      "href",
      "https://github.com/Health-525/scholarflow",
    );
  });
});
