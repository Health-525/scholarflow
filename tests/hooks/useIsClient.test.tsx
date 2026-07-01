/**
 * @vitest-environment node
 */

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useIsClient } from "@/hooks/useIsClient";

function TestComponent() {
  const isClient = useIsClient();
  return <span data-testid="client-flag">{isClient ? "true" : "false"}</span>;
}

describe("useIsClient", () => {
  // Feature: scholarflow-full-optimization, Property 10: useIsClient 水合时序的正确性
  it("Property 10: SSR 阶段返回 false", () => {
    const html = renderToString(<TestComponent />);
    expect(html).toContain(">false<");
  });
});
