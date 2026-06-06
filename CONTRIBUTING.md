# Contributing to ScholarFlow

感谢你想为 ScholarFlow 贡献代码！这是一个个人学习管理项目，但也欢迎社区参与。

## 开发环境

```bash
# Node.js >= 20
cd scholarflow
npm install
npm run dev          # Web 开发模式
npm run electron:dev # Electron 桌面开发模式
```

## 代码规范

- **TypeScript strict mode** — 所有新代码必须通过 `tsc --noEmit`
- **组件**：使用 `function` 声明，文件命名 PascalCase
- **工具函数**：文件命名 kebab-case，纯函数优先
- **CSS**：使用项目自定义的 CSS 变量（`--accent`, `--surface-card` 等），不引入新的第三方 UI 库样式
- **Git 提交**：中文或英文均可，但请描述清楚做了什么

## 提交流程

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feat/your-feature`
3. 确保测试通过：`npm test`
4. 确保类型检查通过：`npx tsc --noEmit`
5. 提交 PR，描述清楚改了什么、为什么改

## 测试

```bash
npm test          # 运行所有测试
npm run test:watch # Watch 模式
```

新功能请补充对应的测试。测试框架使用 Vitest。

## 项目结构

参考 [README.md](./README.md) 中的项目结构说明。

## 问题反馈

- Bug 报告请使用 Issue 模板
- 功能建议请先开 Discussion 讨论
- 安全问题请参考 [SECURITY.md](./SECURITY.md)
