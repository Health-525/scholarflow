import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFindActiveCredentials = vi.fn();
const mockFindMostRecentCredential = vi.fn();
const mockGetCredentials = vi.fn();
const mockReadData = vi.fn();
const mockWriteData = vi.fn();
const mockSaveCredentials = vi.fn();

const mockAdapter = {
  login: vi.fn(),
  fetchSchedule: vi.fn(),
  fetchExams: vi.fn(),
  fetchGrades: vi.fn(),
  fetchJwcNews: vi.fn(),
  periodTimes: {},
  getCurrentSemester: vi.fn(() => ({ year: "2025", semester: "2", week1Monday: "2026-03-02" })),
};

vi.mock("@/lib/auth/origin", () => ({
  INTERNAL_TOKEN_HEADER: "x-scholarflow-internal-token",
  isTrustedOrigin: vi.fn(() => true),
  forbiddenResponse: vi.fn(() => new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })),
}));

vi.mock("@/lib/server-db", () => ({
  getServerDB: vi.fn(() => ({
    findActiveCredentials: mockFindActiveCredentials,
    findMostRecentCredential: mockFindMostRecentCredential,
    getCredentials: mockGetCredentials,
    readData: mockReadData,
    writeData: mockWriteData,
    saveCredentials: mockSaveCredentials,
  })),
}));

vi.mock("@/lib/schools/registry", () => ({
  getAdapter: vi.fn(() => mockAdapter),
}));

vi.mock("@/lib/dashboard/summary", () => ({
  buildDashboardSummary: vi.fn(() => ({ cards: [] })),
}));

vi.mock("@/lib/exams/merge", () => ({
  mergeExams: vi.fn((_existing, fetched) => fetched),
}));

vi.mock("@/lib/crypto-password", () => ({
  decryptPassword: vi.fn(() => null),
}));

describe("POST /api/fetch/all auth guard", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SCHOLARFLOW_INTERNAL_TOKEN: "internal-token" };

    mockFindActiveCredentials.mockReset();
    mockFindMostRecentCredential.mockReset();
    mockGetCredentials.mockReset();
    mockReadData.mockReset();
    mockWriteData.mockReset();
    mockSaveCredentials.mockReset();

    mockAdapter.login.mockReset();
    mockAdapter.fetchSchedule.mockReset();
    mockAdapter.fetchExams.mockReset();
    mockAdapter.fetchGrades.mockReset();
    mockAdapter.fetchJwcNews.mockReset();

    mockAdapter.fetchSchedule.mockResolvedValue([]);
    mockAdapter.fetchExams.mockResolvedValue([]);
    mockAdapter.fetchGrades.mockResolvedValue({
      gpa: "0.00",
      totalCredits: 0,
      requiredCourses: 0,
      allCourses: [],
    });
    mockAdapter.fetchJwcNews.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("浏览器来源请求即使携带 password 也不能绕过账号门控", async () => {
    const { POST } = await import("@/app/api/fetch/all/route");

    mockFindActiveCredentials.mockReturnValue({
      schoolId: "hebau",
      userId: "other-user",
      username: "other-user",
      expiresAt: Date.now() + 60_000,
    });
    mockFindMostRecentCredential.mockReturnValue(null);

    const request = new Request("http://localhost:3000/api/fetch/all", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        schoolId: "hebau",
        username: "2023084010117",
        password: "not-an-auth-signal",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
    expect(mockAdapter.login).not.toHaveBeenCalled();
  });

  it("内部 token 调用允许为当前账号使用 password 进行静默重登", async () => {
    const { POST } = await import("@/app/api/fetch/all/route");

    mockFindActiveCredentials.mockReturnValue({
      schoolId: "hebau",
      userId: "2023084010117",
      username: "2023084010117",
      expiresAt: Date.now() + 60_000,
    });
    mockFindMostRecentCredential.mockReturnValue(null);
    mockGetCredentials.mockReturnValue(null);
    mockAdapter.login.mockResolvedValue({
      schoolId: "hebau",
      data: { username: "2023084010117", cookie: "new-cookie" },
      expiresAt: Date.now() + 60_000,
    });

    const request = new Request("http://localhost:3000/api/fetch/all", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scholarflow-internal-token": "internal-token",
      },
      body: JSON.stringify({
        schoolId: "hebau",
        username: "2023084010117",
        password: "remembered-password",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(mockAdapter.login).toHaveBeenCalledWith({
      username: "2023084010117",
      password: "remembered-password",
    });
    expect(mockSaveCredentials).toHaveBeenCalled();
  });

  it("内部 token 不能跨账号静默重登", async () => {
    const { POST } = await import("@/app/api/fetch/all/route");

    mockFindActiveCredentials.mockReturnValue({
      schoolId: "hebau",
      userId: "other-user",
      username: "other-user",
      expiresAt: Date.now() + 60_000,
    });
    mockFindMostRecentCredential.mockReturnValue(null);
    mockGetCredentials.mockReturnValue(null);

    const request = new Request("http://localhost:3000/api/fetch/all", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scholarflow-internal-token": "internal-token",
      },
      body: JSON.stringify({
        schoolId: "hebau",
        username: "2023084010117",
        password: "remembered-password",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
    expect(mockAdapter.login).not.toHaveBeenCalled();
  });
});
