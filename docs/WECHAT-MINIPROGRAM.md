# WeChat Mini Program 适配方案

> ScholarFlow → 微信小程序 · 架构设计

## 技术选型

推荐使用 **Taro 3.x** 实现一套代码多端运行：

```
ScholarFlow (Next.js/React)
    │
    ├── lib/          ──→ 共享逻辑层（课表引擎、GPA计算、作业解析）
    ├── components/   ──→ UI层（按平台分：web/ vs miniapp/）
    └── app/          ──→ 页面层（按平台分）

ScholarFlow-MP (Taro/React)
    ├── src/pages/    ──→ 小程序页面
    ├── src/components/──→ 小程序UI组件
    └── src/lib/      ──→ 共享逻辑（import from ../../scholarflow/lib）
```

## 关键适配点

### 1. 路由转换
| Next.js | 微信小程序 |
|---------|-----------|
| `useRouter().push("/schedule")` | `Taro.navigateTo({ url: '/pages/schedule/index' })` |
| 文件路由 `app/schedule/page.tsx` | 配置路由 `app.config.ts` |

### 2. localStorage → Taro.setStorageSync
```js
// Shared lib 中使用适配层
const storage = typeof Taro !== 'undefined'
  ? { get: Taro.getStorageSync, set: Taro.setStorageSync }
  : { get: (k) => localStorage.getItem(k), set: (k,v) => localStorage.setItem(k,v) };
```

### 3. 不支持的特性
- `localStorage` → `Taro.setStorageSync`（10MB限制）
- CSS backdrop-filter → 小程序不支持，用纯色替代
- `window.matchMedia` → 用 `Taro.getSystemInfoSync()`
- `fetch()` → Taro.request()

### 4. UI组件库
使用 `taro-ui` 或 `@tarojs/components` 替代 shadcn/ui

## 页面规划（首版）

| 页面 | 路径 | 功能 |
|------|------|------|
| 首页 | pages/index/index | 仪表板概览 |
| 课表 | pages/schedule/index | 周视图课表 |
| 作业 | pages/assignments/index | 作业列表+倒计时 |
| 绩点 | pages/gpa/index | GPA计算器 |
| 考试 | pages/exams/index | 考试倒计时 |
| 目标 | pages/goals/index | 每日目标打卡 |
| 我的 | pages/mine/index | 设置+数据 |

## 快速启动

```bash
# 1. 安装 Taro CLI
npm install -g @tarojs/cli

# 2. 创建项目
taro init ScholarFlow-MP
# 选择: React + TypeScript + Webpack5

# 3. 复制共享逻辑
cp -r ../scholarflow/lib/gpa.ts src/lib/
cp -r ../scholarflow/lib/activity-tracker-v3.ts src/lib/

# 4. 启动开发
taro build --type weapp --watch

# 5. 微信开发者工具打开 dist/ 目录
```

## 注意事项

1. **包大小限制**: 微信小程序主包≤2MB，需分包加载
2. **API限制**: 不能直接调用GitHub API，需通过云函数中转
3. **用户授权**: 需要 wx.getUserProfile 获取用户信息
4. **审核**: 教育类小程序需提供相关资质
