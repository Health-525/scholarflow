import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CatAvatar } from "@/components/ximi/CatAvatar";

describe("CatAvatar", () => {
  it("variant=desktop 渲染含 border-border bg-secondary", () => {
    const { container } = render(<CatAvatar variant="desktop" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("border-border");
    expect(span.className).toContain("bg-secondary");
  });

  it("variant=mobile 渲染含 border-white bg-surface-container", () => {
    const { container } = render(<CatAvatar variant="mobile" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("border-white");
    expect(span.className).toContain("bg-surface-container");
  });

  it("默认 variant 为 desktop", () => {
    const { container } = render(<CatAvatar />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("border-border");
  });

  it("支持传入额外 className", () => {
    const { container } = render(<CatAvatar className="custom-class" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("custom-class");
  });
});
