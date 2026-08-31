/**
 * 河北农业大学适配器 — 连通性测试
 * 用法: npx ts-node --skip-project scripts/test-hebau.ts <学号> <密码>
 */

import { hebauAdapter } from "../lib/schools/hebau";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("用法: npx ts-node --skip-project scripts/test-hebau.ts <学号> <密码>");
    process.exit(1);
  }

  const [username, password] = args;

  console.log(`\n📡 测试 HEBau 适配器 — 学号: ${username}\n`);

  // Step 1: Login
  console.log("1️⃣  登录 CAS 统一认证...");
  let credentials;
  try {
    credentials = await hebauAdapter.login({ username, password });
    console.log("   ✅ 登录成功");
    console.log(`   cookie 长度: ${credentials.data.cookie?.length || 0}`);
    console.log(`   GS_SESSIONID: ${credentials.data.sessionCookie ? "有" : "无"}`);
    console.log(`   过期时间: ${new Date(credentials.expiresAt!).toLocaleString()}`);
  } catch (e: any) {
    console.log(`   ❌ 登录失败: ${e.message}`);
    process.exit(1);
  }

  // Step 2: 学期信息
  console.log("\n2️⃣  获取当前学期...");
  const sem = hebauAdapter.getCurrentSemester?.();
  console.log(`   学年: ${sem?.year}, 学期: ${sem?.semester}, 开学周一: ${sem?.week1Monday}`);

  // Step 3: Fetch Schedule
  console.log("\n3️⃣  抓取课表...");
  try {
    const courses = await hebauAdapter.fetchSchedule(credentials);
    console.log(`   ✅ 获取到 ${courses.length} 门课程`);
    for (const c of courses.slice(0, 3)) {
      console.log(`      - ${c.title} | 周${c.weekday} 第${c.periods.join(",")}节 | ${c.weeks} | ${c.location} | ${c.teacher}`);
    }
    if (courses.length > 3) console.log(`      ... 还有 ${courses.length - 3} 门`);
  } catch (e: any) {
    console.log(`   ❌ 课表抓取失败: ${e.message}`);
  }

  // Step 4: Fetch Exams
  console.log("\n4️⃣  抓取考试安排...");
  try {
    const exams = await hebauAdapter.fetchExams?.(credentials);
    console.log(`   ✅ 获取到 ${exams?.length || 0} 门考试`);
    for (const e of (exams || []).slice(0, 3)) {
      console.log(`      - ${e.subject} | ${e.date} ${e.time} | ${e.location}`);
    }
  } catch (e: any) {
    console.log(`   ❌ 考试抓取失败: ${e.message}`);
  }

  // Step 5: Fetch Grades
  console.log("\n5️⃣  抓取成绩...");
  try {
    const grades = await hebauAdapter.fetchGrades(credentials);
    console.log(`   ✅ GPA: ${grades.gpa} | 必修学分(GPA 分母): ${grades.requiredCredits} | 必修课: ${grades.requiredCourses} 门 | 全部课程: ${grades.allCourses.length} 门`);
    for (const c of grades.allCourses.slice(0, 5)) {
      console.log(`      - ${c.course} | ${c.score} | ${c.credit}学分 | ${c.type} | ${c.semester}`);
    }
    if (grades.allCourses.length > 5) console.log(`      ... 还有 ${grades.allCourses.length - 5} 门`);
  } catch (e: any) {
    console.log(`   ❌ 成绩抓取失败: ${e.message}`);
  }

  console.log("\n✅ 测试完成\n");
}

main().catch((e) => {
  console.error("测试异常:", e.message || e);
  process.exit(1);
});
