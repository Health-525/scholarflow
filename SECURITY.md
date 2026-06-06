# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x    | ✅ Yes    |

## 报告安全漏洞

如果你发现安全漏洞，请不要在公开 Issue 中报告。

请发送邮件到仓库维护者的 GitHub 关联邮箱，描述漏洞细节和复现步骤。

我们会在 48 小时内确认收到报告，并在 7 天内给出初步评估和修复计划。

## 安全设计

ScholarFlow 的安全设计要点：

- **Token 存储**：Electron 环境使用系统级加密（DPAPI/Keychain），Web 环境使用 localStorage（基础混淆）
- **XSS 防护**：所有 Markdown 渲染通过 DOMPurify 清洗
- **API 请求**：GitHub Token 仅通过 HTTPS 传输
- **依赖审计**：定期使用 `npm audit` 检查已知漏洞

## 已知的安全边界

- PWA 模式下 Token 存储在 localStorage 中，这是浏览器限制。建议只在可信任的个人设备上使用 PWA 模式
- 公开仓库中的日报/周报数据已经过脱敏处理，不包含真实手机号、邮箱等个人信息
