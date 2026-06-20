# 学校适配器开发指南

本文档面向想为 ScholarFlow 接入新学校教务系统的开发者。

---

## 概览

ScholarFlow 的学校数据层通过 **SchoolAdapter 接口**隔离，每所学校实现这套接口，核心代码不需要修改。

目前内置学校：
- `njtech` — 南京工业大学（正方教务系统 + 图书馆座位系统）
- `mock` — 开发测试用 Mock 适配器

---

## 快速开始：用 Mock 适配器跑通流程

在正式接入真实学校之前，可以先用 Mock 适配器验证开发环境：

```typescript
// lib/schools/registry.ts（仅开发环境）
import { mockAdapter } from "./mock";
registerSchool(mockAdapter);
```

然后在登录页选择 "Mock University"，任意学号 + 密码均可登录，所有页面将展示 fixture 数据。

---

## 接口定义

完整类型定义见 `lib/schools/types.ts`。核心接口：

```typescript
export interface SchoolAdapter {
  id: string;           // 唯一标识，小写字母 + 数字，如 "njtech"、"seu"
  name: string;         // 显示名称，如 "东南大学"
  loginFields: LoginField[];

  // 必须实现
  login(credentials: Record<string, string>): Promise<SchoolCredentials>;
  fetchSchedule(credentials: SchoolCredentials): Promise<CourseData[]>;
  fetchExams(credentials: SchoolCredentials): Promise<ExamData[]>;
  fetchGrades(credentials: SchoolCredentials): Promise<GradeResult>;

  // 可选实现
  fetchLibrary?(credentials: SchoolCredentials): Promise<LibraryData | null>;
  fetchJwcNews?(existingItems?: NewsItem[]): Promise<NewsItem[]>;
  getCurrentSemester?(): { year: string; semester: string; week1Monday: string };
}
```

### `login()` 的职责

1. 用提交的表单字段（学号、密码等）向教务系统发起登录请求
2. 验证登录是否成功
3. 返回 `SchoolCredentials`，其中 `data` 字段存放后续请求需要的凭证（cookie、token 等）

`data` 字段内容由适配器自己定义，框架不关心其结构——它会被加密存储，并在后续调用 `fetchSchedule` 等方法时原样传回。

---

## 最小实现示例

以一个假想的"XYZ 大学（正方系统）"为例：

```typescript
// lib/schools/xyz/index.ts
import type { SchoolAdapter, SchoolCredentials, CourseData, ExamData, GradeResult } from "../types";

export const xyzAdapter: SchoolAdapter = {
  id: "xyz",
  name: "XYZ 大学",

  loginFields: [
    { key: "username", label: "学号", type: "text", placeholder: "如 2023001", required: true },
    { key: "password", label: "教务密码", type: "password", required: true },
  ],

  async login(credentials): Promise<SchoolCredentials> {
    const { username, password } = credentials;

    // 向教务系统发起登录（HTTPS 请求）
    const res = await fetch("https://jwc.xyz.edu.cn/login", {
      method: "POST",
      body: new URLSearchParams({ username, password }),
    });

    if (!res.ok) throw new Error("登录失败，请检查学号和密码");

    // 从响应头提取 session cookie
    const cookie = res.headers.get("set-cookie") ?? "";
    if (!cookie) throw new Error("登录响应未返回有效 session");

    return {
      schoolId: "xyz",
      data: { username, cookie },
      expiresAt: Date.now() + 30 * 60 * 1000,  // 30 分钟
    };
  },

  async fetchSchedule(credentials): Promise<CourseData[]> {
    const res = await fetch("https://jwc.xyz.edu.cn/schedule", {
      headers: { Cookie: credentials.data.cookie },
    });
    const raw = await res.json();
    // 将学校返回的格式映射到 CourseData[]
    return raw.courses.map((c: Record<string, unknown>) => ({
      title: c.kcmc as string,
      weekday: c.xqj as number,
      periods: (c.skjc as string).split(",").map(Number),
      weeks: c.zc as string,
      location: c.jsmc as string,
      teacher: c.jsxm as string,
    }));
  },

  async fetchExams(credentials): Promise<ExamData[]> {
    // 同上，映射考试数据
    return [];
  },

  async fetchGrades(credentials): Promise<GradeResult> {
    // 同上，映射成绩数据
    return { gpa: "0", totalCredits: 0, requiredCourses: 0, allCourses: [] };
  },
};
```

然后注册：

```typescript
// lib/schools/registry.ts
import { xyzAdapter } from "./xyz";
registerSchool(xyzAdapter);
```

---

## 常见教务系统登录模式

### 正方教务系统（大多数高校）

正方系统使用 cookie-based session，登录流程通常是：

1. `GET /jwglxt/xtgl/login_slogin.html` 获取 `csrfToken` 和初始 cookie
2. `POST /jwglxt/xtgl/login_slogin.html` 提交 `username`、加密后的 `password`、`csrfToken`
3. 响应 302 redirect，从 `Set-Cookie` 头提取 `JSESSIONID`

密码加密方式：正方系统通常用 AES-CBC + RSA 公钥加密密码，公钥通过 `/jwglxt/xtgl/login_slogin.html` 页面 JS 动态获取。参考 `lib/schools/njtech/jwgl.ts` 的实现。

### CAS 统一认证系统

部分高校使用 CAS SSO：

1. 访问目标系统，被重定向到 CAS 登录页（`/cas/login?service=...`）
2. 提取 `_eventId_submit`、`execution` hidden 字段
3. POST 登录，获取 `TGC` cookie 和 `ST` ticket
4. 用 `ST` 换取目标系统的 session

### 验证码处理

如果登录需要图形验证码：

```typescript
// 在 loginFields 中声明验证码字段
loginFields: [
  { key: "username", label: "学号", type: "text", required: true },
  { key: "password", label: "密码", type: "password", required: true },
  { key: "captcha", label: "验证码", type: "text", required: true },
];
// login() 中同时提交验证码
```

ScholarFlow 的登录表单会渲染所有 `loginFields`，用户手动填写验证码后提交。

### VPN 和证书问题

如果学校系统只在校园网/VPN 内可访问：

- 在 `login()` 开头检查并提示用户连接 VPN
- 如果使用自签名证书，需要在 `electron/main.js` 的 `setCertificateVerifyProc` 中添加对应域名的信任规则（仅限 Electron 环境）

---

## 返回数据格式说明

### `CourseData`

```typescript
{
  title: string;       // 课程名称
  weekday: number;     // 1=周一, 2=周二, ..., 7=周日
  periods: number[];   // 节次，如 [1, 2] 表示第1-2节
  weeks: string;       // 周次字符串，如 "1-16"、"1-8单"、"2-16双"
  location: string;    // 上课地点
  teacher: string;     // 教师姓名
}
```

`weeks` 字段格式建议：
- 连续周：`"1-16"`
- 单周：`"1-16单"`
- 双周：`"2-16双"`
- 不连续：`"1-8,10-16"`

### `GradeResult`

```typescript
{
  gpa: string;            // 如 "3.75"（字符串以保留精度）
  totalCredits: number;   // 已获得总学分
  requiredCourses: number; // 已修必修课程数
  allCourses: GradeCourse[];
}
```

`GradeCourse.semester` 格式：`"YYYY-YYYY+1-N"`，如 `"2024-2025-1"`、`"2024-2025-2"`。

---

## 错误处理规范

适配器方法应抛出具有明确提示的错误，而不是返回空数据：

```typescript
// ✅ 好的做法
if (!cookie) throw new Error("登录失败，请检查学号和密码是否正确");
if (res.status === 403) throw new Error("账号被锁定，请联系教务处");

// ❌ 避免
return [];  // 静默失败，用户不知道出了什么问题
```

框架会将错误消息展示在登录页或数据加载失败的 toast 中。

---

## 如何在没有真实账号时调试

1. 使用 Mock 适配器跑通 UI 流程（见上文"快速开始"）
2. 用 Charles / mitmproxy 抓包学校 App 或官网的登录请求，分析协议
3. 在 `lib/schools/xyz/` 下先写静态 fixture 版本，打通数据流后再接入真实 HTTP 请求
4. 用 `vitest` 写单元测试，mock HTTP 响应验证数据映射逻辑

---

## 测试要求

新增适配器 PR 需提供：

1. **登录成功的单元测试**（mock HTTP 响应）
2. **登录失败（密码错误）的单元测试**
3. **`fetchSchedule` 数据映射测试**（验证 `weekday`、`periods`、`weeks` 格式正确）
4. **`fetchGrades` GPA 计算测试**（如果适配器自己算 GPA）

参考 `tests/features.test.ts` 中的测试风格。

---

## 提交 PR 检查清单

- [ ] 适配器 id 全小写，不含空格（如 `seu`、`nju`、`hust`）
- [ ] 所有必须方法已实现（`login`、`fetchSchedule`、`fetchExams`、`fetchGrades`）
- [ ] `loginFields` 至少包含 `username` 和 `password`
- [ ] 错误消息使用中文，面向最终用户
- [ ] 不在代码中硬编码学号、密码、cookie（测试用 fixture 除外）
- [ ] 在 `registry.ts` 中已注册
- [ ] 提供了基本单元测试
- [ ] 在 PR 描述中说明所测试的学校系统类型（正方 / CAS / 其他）

---

## 获取帮助

如果遇到教务系统协议问题，欢迎在 GitHub Discussion 中讨论。接入新学校通常需要：

- 学校域名和系统类型
- 登录接口抓包结果（脱敏处理，去掉真实账号信息）
- 数据接口返回的字段说明
