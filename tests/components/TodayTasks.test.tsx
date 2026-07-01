import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";

import { TodayTasks } from "@/components/ximi/MobileHome";
import * as useQueriesModule from "@/hooks/useQueries";
import * as useIsClientModule from "@/hooks/useIsClient";
import type { Assignment } from "@/types";

vi.mock("@/hooks/useQueries");
vi.mock("@/hooks/useIsClient");

function makeAssignments(n: number): Assignment[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `a-${i}`,
    subject: `科目 ${i}`,
    title: `作业 ${i}`,
    deadline: new Date(Date.now() + 86400000).toISOString(),
    done: false,
    createdAt: new Date().toISOString(),
  }));
}

describe("TodayTasks", () => {
  beforeEach(() => {
    vi.mocked(useIsClientModule.useIsClient).mockReturnValue(true);
  });

  // Feature: scholarflow-full-optimization, Property 11: TodayTasks 更多任务链接的显示不变量
  it("Property 11: 待办数 n>4 时显示更多链接，n≤4 时不显示", () => {
    fc.assert(
      fc.property(fc.nat(20), (n) => {
        vi.mocked(useQueriesModule.useAssignmentsQuery).mockReturnValue({
          assignments: makeAssignments(n),
          isLoading: false,
          error: null,
          reload: vi.fn(),
          add: vi.fn(),
          markDone: vi.fn(),
          reorder: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          isAdding: false,
          isMarking: false,
          isReordering: false,
        } as unknown as ReturnType<typeof useQueriesModule.useAssignmentsQuery>);

        const { unmount } = render(<TodayTasks />);

        const moreLink = screen.queryByRole("link", { name: /还有 \d+ 项待办/ });
        const expected = n > 4;
        const actual = moreLink !== null;

        unmount();

        return expected === actual;
      }),
      { numRuns: 100 },
    );
  });

  it("n=5 时显示「还有 1 项待办」", () => {
    vi.mocked(useQueriesModule.useAssignmentsQuery).mockReturnValue({
      assignments: makeAssignments(5),
      isLoading: false,
      error: null,
      reload: vi.fn(),
      add: vi.fn(),
      markDone: vi.fn(),
      reorder: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      isAdding: false,
          isMarking: false,
          isReordering: false,
    } as unknown as ReturnType<typeof useQueriesModule.useAssignmentsQuery>);

    render(<TodayTasks />);
    expect(screen.getByRole("link", { name: "还有 1 项待办" })).toBeInTheDocument();
  });

  it("n=4 时不显示更多链接", () => {
    vi.mocked(useQueriesModule.useAssignmentsQuery).mockReturnValue({
      assignments: makeAssignments(4),
      isLoading: false,
      error: null,
      reload: vi.fn(),
      add: vi.fn(),
      markDone: vi.fn(),
      reorder: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      isAdding: false,
      isMarking: false,
      isReordering: false,
    } as unknown as ReturnType<typeof useQueriesModule.useAssignmentsQuery>);

    render(<TodayTasks />);
    expect(screen.queryByRole("link", { name: /还有 \d+ 项待办/ })).not.toBeInTheDocument();
  });
});
