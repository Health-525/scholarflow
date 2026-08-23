/**
 * NJTECH 选课模块单元测试
 * 纯解析函数 fixture 测试（不发网络请求），参照 hebao-adapter.test.ts 模式
 */

import { describe, it, expect } from "vitest";

import {
  parseCourseList,
  parseXkklcId,
  isSessionExpired,
  matchTargets,
  type XkCourse,
} from "@/lib/schools/njtech/xk";

// ── parseCourseList ───────────────────────────────────────────

describe("parseCourseList", () => {
  it("解析 zzxkyzb 族结构（jxbrys + 下划线字段名）", () => {
    const json = {
      jxbrys: [
        {
          jxb_id: "jxb-zz-001",
          kch_id: "PE102",
          kcmc: "羽毛球",
          jsxx: "孙七",
          xf: "1",
          jxb_rl: "80",
          xkrs: "79",
          syrl: "1",
        },
        {
          jxb_id: "jxb-zz-002",
          kch_id: "PE103",
          kcmc: "游泳",
          jsxx: "周八",
          xf: "1",
          jxb_rl: 40,
          xkrs: 40,
          syrl: 0,
        },
      ],
    };

    const courses = parseCourseList(json);
    expect(courses).toHaveLength(2);

    expect(courses[0]).toMatchObject({
      jxbId: "jxb-zz-001",
      courseCode: "PE102",
      courseName: "羽毛球",
      teacher: "孙七",
      capacity: 80,
      selected: 79,
      remain: 1,
    });

    expect(courses[1]).toMatchObject({
      jxbId: "jxb-zz-002",
      capacity: 40,
      selected: 40,
      remain: 0,
    });
  });

  it("zzxk 族无 syrl 字段时用容量-已选兜底", () => {
    const json = {
      jxbrys: [
        {
          jxb_id: "jxb-zz-003",
          kcmc: "篮球",
          jxb_rl: "60",
          xkrs: "55",
        },
      ],
    };

    const courses = parseCourseList(json);
    expect(courses[0].remain).toBe(5);
  });

  it("解析正方新版嵌套结构（tmpList + jxb/kkxx）", () => {
    const json = {
      tmpList: [
        {
          jxb: {
            jxbid: "jxb-001",
            jxbrl: "120",
            yxjxrs: "119",
            jg0xxrs: "1",
          },
          kkxx: {
            kch: "MATH101",
            kcmc: "高等数学A（上）",
            xf: "5",
          },
          jsxx: "张三",
        },
        {
          jxb: {
            jxbid: "jxb-002",
            jxbrl: 100,
            yxjxrs: 100,
            jg0xxrs: 0,
          },
          kkxx: {
            kch: "CS101",
            kcmc: "数据结构",
            xf: "3",
          },
          jsxx: "李四",
        },
      ],
    };

    const courses = parseCourseList(json);
    expect(courses).toHaveLength(2);

    expect(courses[0]).toMatchObject({
      jxbId: "jxb-001",
      courseCode: "MATH101",
      courseName: "高等数学A（上）",
      teacher: "张三",
      credit: "5",
      capacity: 120,
      selected: 119,
      remain: 1,
    });

    expect(courses[1]).toMatchObject({
      jxbId: "jxb-002",
      courseName: "数据结构",
      capacity: 100,
      selected: 100,
      remain: 0,
    });
  });

  it("解析平铺结构（kbList）并支持备选字段名", () => {
    const json = {
      kbList: [
        {
          jxbid: "jxb-003",
          kcmc: "大学英语",
          jgxm: "王五",
          xf: "2",
          rl: "60",
          yxbrs: "58",
          kxrs: "2",
        },
      ],
    };

    const courses = parseCourseList(json);
    expect(courses).toHaveLength(1);
    expect(courses[0]).toMatchObject({
      jxbId: "jxb-003",
      courseName: "大学英语",
      teacher: "王五",
      capacity: 60,
      selected: 58,
      remain: 2,
    });
  });

  it("无 remain 字段时用容量-已选兜底", () => {
    const json = {
      tmpList: [
        {
          jxb: { jxbid: "jxb-004", jxbrl: "50", yxjxrs: "47" },
          kkxx: { kcmc: "体育", xf: "1" },
        },
      ],
    };

    const courses = parseCourseList(json);
    expect(courses[0].capacity).toBe(50);
    expect(courses[0].selected).toBe(47);
    expect(courses[0].remain).toBe(3);
  });

  it("remain 为 0 时也用容量-已选兜底", () => {
    const json = {
      tmpList: [
        {
          jxb: { jxbid: "jxb-005", jxbrl: "50", yxjxrs: "50", jg0xxrs: "0" },
          kkxx: { kcmc: "满员课", xf: "1" },
        },
      ],
    };

    const courses = parseCourseList(json);
    expect(courses[0].remain).toBe(0);
  });

  it("jxb 优先级高于 kkxx（教学班字段覆盖开课信息）", () => {
    const json = {
      tmpList: [
        {
          jxb: { jxbid: "jxb-a", kcmc: "教学班视角的课名" },
          kkxx: { kcmc: "开课视角的课名" },
        },
      ],
    };

    const courses = parseCourseList(json);
    expect(courses[0].courseName).toBe("教学班视角的课名");
  });

  it("非对象输入返回空数组", () => {
    expect(parseCourseList(null)).toEqual([]);
    expect(parseCourseList(undefined)).toEqual([]);
    expect(parseCourseList("invalid")).toEqual([]);
    expect(parseCourseList({})).toEqual([]);
  });

  it("空列表返回空数组", () => {
    expect(parseCourseList({ tmpList: [] })).toEqual([]);
    expect(parseCourseList({ kbList: [] })).toEqual([]);
  });

  it("保留原始数据 raw", () => {
    const json = {
      tmpList: [
        {
          jxb: { jxbid: "jxb-006" },
          kkxx: { kcmc: "任意课" },
          extraField: "校准用",
        },
      ],
    };

    const courses = parseCourseList(json);
    expect((courses[0].raw as Record<string, unknown>).extraField).toBe(
      "校准用"
    );
  });
});

// ── parseXkklcId ──────────────────────────────────────────────

describe("parseXkklcId", () => {
  it("从 input 标签提取", () => {
    const html = `<input type="hidden" id="xkklcId" value="abc123">`;
    expect(parseXkklcId(html)).toBe("abc123");
  });

  it("从 JS 变量提取", () => {
    const html = `<script>var xkklcId = "xyz789";</script>`;
    expect(parseXkklcId(html)).toBe("xyz789");
  });

  it("下划线命名 xkklc_id 也能提取", () => {
    const html = `<script>var xkklc_id = "und321";</script>`;
    expect(parseXkklcId(html)).toBe("und321");
  });

  it("对象字面量形式", () => {
    const html = `<script>var config = {xkklcId: "obj456"};</script>`;
    expect(parseXkklcId(html)).toBe("obj456");
  });

  it("无匹配返回 null", () => {
    expect(parseXkklcId("<html>选课未开放</html>")).toBeNull();
    expect(parseXkklcId("")).toBeNull();
  });

  it("input 写法 value 在 id 之前也能匹配 JS 变量", () => {
    const html = `<script>xkklcId="front999";</script><input value="x" id="xkklcId">`;
    // input 正则要求 id 在 value 前，此写法应走 JS 分支
    expect(parseXkklcId(html)).toBe("front999");
  });
});

// ── isSessionExpired ──────────────────────────────────────────

describe("isSessionExpired", () => {
  it("登录页 URL 特征", () => {
    expect(isSessionExpired('<script>location="/xtgl/login_slogin.html"</script>')).toBe(true);
  });

  it("登录页 CSRF 表单特征", () => {
    expect(isSessionExpired('<input id="csrftoken" value="xxx">')).toBe(true);
  });

  it("「用户登录」文案特征", () => {
    expect(isSessionExpired("<title>用户登录</title>")).toBe(true);
  });

  it("正常 JSON 响应不误判", () => {
    expect(isSessionExpired('{"tmpList":[],"flag":"1"}')).toBe(false);
    expect(isSessionExpired("")).toBe(false);
  });
});

// ── matchTargets ──────────────────────────────────────────────

describe("matchTargets", () => {
  const course: XkCourse = {
    jxbId: "jxb-1",
    courseCode: "CS102",
    courseName: "人工智能导论",
    teacher: "赵六",
    credit: "2",
    capacity: 100,
    selected: 80,
    remain: 20,
    raw: {},
  };

  it("课程名包含即命中", () => {
    expect(matchTargets(course, [{ courseName: "人工智能" }])).toBe(true);
  });

  it("课程名不包含不命中", () => {
    expect(matchTargets(course, [{ courseName: "机器学习" }])).toBe(false);
  });

  it("指定教师时需同时匹配", () => {
    expect(matchTargets(course, [{ courseName: "人工智能", teacher: "赵" }])).toBe(true);
    expect(matchTargets(course, [{ courseName: "人工智能", teacher: "钱" }])).toBe(false);
  });

  it("多目标任一命中即可", () => {
    expect(
      matchTargets(course, [
        { courseName: "机器学习" },
        { courseName: "人工智能" },
      ])
    ).toBe(true);
  });

  it("空关键词不命中", () => {
    expect(matchTargets(course, [{ courseName: "" }])).toBe(false);
  });

  it("空目标列表不命中", () => {
    expect(matchTargets(course, [])).toBe(false);
  });
});
