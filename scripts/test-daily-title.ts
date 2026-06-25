import { buildDailyReportMarkdown } from "@/lib/reports/daily";

function testTitle(name: string, partial: Record<string, unknown>) {
  const input = {
    date: "2026-06-23",
    now: Date.now(),
    courses: [],
    dayItems: [],
    tomorrowCourses: [],
    tomorrowDayItems: [],
    assignments: [],
    exams: [],
    goals: [],
    goalStreak: 0,
    jwcNews: [],
    screenTime: null,
    pomodoro: null,
    ...partial,
  };
  const md = buildDailyReportMarkdown(input as any);
  const title = md.split("\n")[0];
  console.log(`${name}: ${title}`);
}

testTitle("无课+屏幕", { screenTime: { totalActiveMinutes: 918, categoryBreakdown: [], topApps: [] } });
testTitle("考试日", { exams: [{ subject: "数据结构", date: "2026-06-23", time: "09:00", location: "A101", notes: "", status: "active" }] });
testTitle("备考", { exams: [{ subject: "高数", date: "2026-06-25", time: "", location: "", notes: "", status: "active" }] });
testTitle("作业截止", { assignments: [{ id: "1", title: "作业1", deadline: "2026-06-23", done: false, subject: "数学" }, { id: "2", title: "作业2", deadline: "2026-06-23", done: false, subject: "英语" }, { id: "3", title: "作业3", deadline: "2026-06-23", done: false, subject: "物理" }] });
testTitle("有课", { courses: [{ title: "数学", weekday: 1, periods: [1, 2], teacher: "张老师", location: "A101", timeText: "08:00" }] });
testTitle("专注", { pomodoro: { todaySessions: 6, todayFocusSeconds: 1800, streak: 3 } });
