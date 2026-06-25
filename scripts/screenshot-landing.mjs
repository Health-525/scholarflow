import { spawn } from "child_process";
import { chromium } from "playwright";

const PORT = process.env.PORT || "3004";
const BASE_URL = `http://localhost:${PORT}`;
const DUMMY_USER_ID = "20260010001";
const DUMMY_SCHOOL_ID = "demo";

const AUTH_STATE = JSON.stringify({
  state: {
    schoolId: DUMMY_SCHOOL_ID,
    userId: DUMMY_USER_ID,
    username: "同学",
    isAuthenticated: true,
    _hasHydrated: true,
  },
  version: 0,
});

const today = new Date();
const weekday = today.getDay() === 0 ? 7 : today.getDay();
const todayIso = today.toISOString().slice(0, 10);
const futureExamDate = new Date(today);
futureExamDate.setDate(today.getDate() + 10);
const examDateStr = futureExamDate.toISOString().slice(0, 10);

const mockData = {
  dashboard: {
    updatedAt: new Date().toISOString(),
    date: todayIso,
    overview: {
      courses: 8,
      todayCourses: 2,
      pendingAssignments: 3,
      urgentAssignments: 1,
      gpa: "3.85",
    },
  },
  schedule: {
    meta: {
      week1_monday: "2026-04-20",
      tz: "Asia/Shanghai",
      semester: "2025-2026-2",
      schoolId: DUMMY_SCHOOL_ID,
    },
    periodTimes: {
      "1": "08:00-08:45",
      "2": "08:55-09:40",
      "3": "10:00-10:45",
      "4": "10:55-11:40",
      "5": "14:00-14:45",
      "6": "14:55-15:40",
      "7": "16:00-16:45",
      "8": "16:55-17:40",
    },
    courses: [
      {
        title: "高等数学",
        weekday,
        periods: [1, 2],
        weeks: "1-16",
        location: "教学楼 A-101",
        teacher: "张教授",
      },
      {
        title: "大学英语",
        weekday,
        periods: [3, 4],
        weeks: "1-16",
        location: "教学楼 B-202",
        teacher: "李老师",
      },
      {
        title: "程序设计基础",
        weekday: weekday === 1 ? 2 : 1,
        periods: [5, 6],
        weeks: "1-16",
        location: "机房 C-305",
        teacher: "王教授",
      },
    ],
  },
  adjustments: [],
  assignments: [
    {
      id: "a1",
      subject: "高等数学",
      title: "习题册 P32 1-5",
      deadline: todayIso,
      done: false,
      createdAt: "2026-06-20T10:00:00.000Z",
    },
    {
      id: "a2",
      subject: "大学英语",
      title: "听力练习 Unit 6",
      deadline: (() => { const d = new Date(today); d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10); })(),
      done: false,
      createdAt: "2026-06-21T10:00:00.000Z",
    },
    {
      id: "a3",
      subject: "程序设计",
      title: "实验报告三",
      deadline: (() => { const d = new Date(today); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); })(),
      done: false,
      createdAt: "2026-06-22T10:00:00.000Z",
    },
  ],
  exams: [
    { kcmc: "高等数学（上）", kssj: `${examDateStr} (09:00-11:00)`, jxdd: "教学楼 A-101" },
    { kcmc: "大学英语", kssj: `${(Number(examDateStr.slice(-2)) + 3).toString().padStart(2, "0")} (14:00-16:00)`, jxdd: "教学楼 B-202" },
  ],
  "jwc-news": [
    { title: "关于 2025-2026 学年第二学期期末考试安排的通知", date: "2026-06-20", url: "#", category: "通知公告" },
    { title: "图书馆暑期开放时间安排", date: "2026-06-18", url: "#", category: "教学动态" },
  ],
  grades: { gpa: "3.85", totalCredits: 48, allCourses: [] },
  student: { studentId: DUMMY_USER_ID, gpa: "3.85", totalCredits: 48, courseCount: 8 },
  dailyReports: [],
  weeklyReports: [],
};

function waitForServer(url, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(async () => {
      try {
        const res = await fetch(url);
        if (res.status === 200) {
          clearInterval(timer);
          resolve();
        }
      } catch {
        if (Date.now() - start > timeout) {
          clearInterval(timer);
          reject(new Error(`Server did not start within ${timeout}ms`));
        }
      }
    }, 1000);
  });
}

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });

  const capture = async (name, viewport) => {
    const context = await browser.newContext({
      baseURL: BASE_URL,
      viewport,
      timezoneId: "Asia/Shanghai",
    });
    const page = await context.newPage();

    await page.route("/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: true,
          schoolId: DUMMY_SCHOOL_ID,
          userId: DUMMY_USER_ID,
          username: "同学",
        }),
      });
    });

    await page.route(/\/api\/local-data.*/, async (route) => {
      const url = new URL(route.request().url());
      const type = url.searchParams.get("type") || "";
      const data = mockData[type] ?? (type === "assignments" || type === "exams" || type === "dailyReports" || type === "weeklyReports" ? [] : {});
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });

    await page.route("/api/local-save", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await page.addInitScript((state) => {
      window.localStorage.setItem("sf_auth", state);
      window.localStorage.setItem("sf_theme", "system");
      window.localStorage.setItem("sf_skin", "ximi");
    }, AUTH_STATE);

    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    // Hide Next.js dev overlay / toasts / issue indicators
    await page.addStyleTag({
      content: `
        [data-nextjs-portal],
        #__nextjs-portal-root,
        .nextjs-toast,
        nextjs-portal,
        [aria-label*="error" i],
        [role="dialog"][data-nextjs-dialog] {
          display: none !important;
        }
      `,
    });

    let path;
    if (name === "desktop") path = "landing/assets/dashboard-verify.png";
    else if (name === "showcase") path = "landing/assets/desktop-_.png";
    else path = `landing/assets/${name}.png`;

    await page.screenshot({ path, fullPage: name === "mobile" });
    console.log("✓", path);
    await context.close();
  };

  await capture("desktop", { width: 1440, height: 900 });
  await capture("showcase", { width: 1280, height: 900 });
  await capture("mobile", { width: 390, height: 844 });

  await browser.close();
}

function killTree(pid) {
  return new Promise((resolve) => {
    const killer = spawn("taskkill", ["/T", "/F", "/PID", String(pid)], {
      shell: true,
      stdio: "ignore",
    });
    killer.on("exit", resolve);
    killer.on("error", resolve);
    setTimeout(resolve, 3000);
  });
}

let devServer;
(async () => {
  console.log("Starting dev server on port", PORT);
  devServer = spawn("npm", ["run", "dev"], {
    env: { ...process.env, PORT },
    shell: true,
    stdio: "inherit",
  });

  try {
    await waitForServer(BASE_URL);
    console.log("Server ready, taking screenshots...");
    await takeScreenshots();
    console.log("Done");
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    if (devServer && devServer.pid) {
      await killTree(devServer.pid);
    }
    process.exit(process.exitCode || 0);
  }
})();
