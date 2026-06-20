# 数据模型说明

本文档描述 ScholarFlow 的本地数据存储结构、Key 命名规范、账号隔离策略、迁移规范，以及未来的演进方向。

---

## 存储引擎

ScholarFlow 使用 **SQLite（better-sqlite3）** 作为本地数据库，数据库文件路径：

| 运行环境 | 数据库路径 |
|----------|-----------|
| 开发模式（`next dev`） | `<项目根>/data/scholarflow.db` |
| Electron 生产打包 | `%APPDATA%\ScholarFlow\data\scholarflow.db`（Windows）<br>`~/Library/Application Support/ScholarFlow/data/scholarflow.db`（macOS） |
| 环境变量覆盖 | `$SCHOLARFLOW_DATA_DIR/scholarflow.db` |

路径解析逻辑见 `lib/server-db.ts` 中的 `resolveDataDir()`。

---

## 数据库 Schema

### `data_store` — 通用键值存储

```sql
CREATE TABLE data_store (
  key        TEXT    PRIMARY KEY,
  content    TEXT    NOT NULL,     -- JSON 序列化的数据
  updated_at INTEGER NOT NULL      -- Unix 时间戳（毫秒）
);
```

用途：存储课表、成绩、作业、跑步记录、配置等所有结构化数据。

### `credentials` — 账号凭证

```sql
CREATE TABLE credentials (
  school_id       TEXT    NOT NULL,
  user_id         TEXT    NOT NULL,
  credential_data TEXT    NOT NULL,  -- JSON，含 cookie/token（当前明文）
  expires_at      INTEGER,           -- 凭证过期时间戳（毫秒），NULL 表示不过期
  created_at      INTEGER NOT NULL,
  PRIMARY KEY (school_id, user_id)
);
```

### `schema_version` — 迁移版本

```sql
CREATE TABLE schema_version (
  version INTEGER NOT NULL
);
```

当前版本：`1`。

---

## Key 命名规范

`data_store` 使用结构化 Key，格式为：

```
<数据类型>:<schoolId>:<userId>
```

### 账号级 Key（含 schoolId + userId，随退出登录清除）

| Key 格式 | 数据内容 |
|----------|---------|
| `schedule:<schoolId>:<userId>` | 课表原始数据 |
| `exams:<schoolId>:<userId>` | 考试安排 |
| `grades:<schoolId>:<userId>` | 成绩 + GPA |
| `assignments:<schoolId>:<userId>` | 作业列表 |
| `running:<schoolId>:<userId>` | 跑步记录 |
| `jwc-news:<schoolId>:<userId>` | 教务公告 |
| `remember-setting:<schoolId>:<userId>` | 记住密码偏好 |
| `auto-refresh-state:<schoolId>:<userId>` | 自动刷新调度状态 |

### 应用级 Key（与账号无关，不随退出登录清除）

| Key 格式 | 数据内容 |
|----------|---------|
| `app:theme` | 主题设置（亮/暗/系统） |
| `app:notifications` | 通知偏好 |

### 清除策略

退出登录时，通过 `deleteDataByPrefix(schoolId:userId)` 删除所有账号级 Key，匹配规则为：

```sql
DELETE FROM data_store WHERE key LIKE '%:<schoolId>:<userId>' ESCAPE '\'
```

---

## 账号隔离

多账号场景下，不同学校/学号的数据通过 Key 前缀严格隔离：

```
schedule:njtech:202321144057  ← 账号 A
schedule:njtech:202312345678  ← 账号 B（不同学号）
schedule:mock:test_user       ← Mock 学校账号
```

`credentials` 表以 `(school_id, user_id)` 为联合主键，天然隔离。

---

## 迁移规范

### 版本管理

当需要变更 Schema 时，按以下步骤操作：

1. 在 `lib/server-db.ts` 的 `CURRENT_VERSION` 常量中递增版本号
2. 在 `ensureSchemaVersion()` 中添加对应的迁移逻辑
3. 旧版本 `data_store` 数据（JSON blob）**不强制迁移**，采用惰性兼容

示例：

```typescript
private ensureSchemaVersion(): void {
  const row = this.db.prepare('SELECT version FROM schema_version LIMIT 1').get();
  const current = (row as { version: number } | undefined)?.version ?? 0;

  if (current < 2) {
    // v1 → v2 迁移：新增 activity_log 表
    this.db.exec(`CREATE TABLE IF NOT EXISTS activity_log (...)`);
    this.db.prepare('UPDATE schema_version SET version = 2').run();
  }
}
```

### Legacy JSON 迁移

从老版本（JSON 文件存储）迁移到 SQLite 的逻辑在 `lib/data-migrate.ts`，在 `ServerDB` 构造时自动执行，幂等（已迁移不重复执行）。

---

## localStorage 数据

以下数据存储在浏览器 / Electron WebView 的 `localStorage` 中，**不经过 SQLite**：

| Key | 内容 | 所属模块 |
|-----|------|---------|
| `sf_daily_goals` | 当日目标列表 | 每日目标 |
| `sf_goal_streak` | 连续完成天数 | 每日目标 |
| `sf_goal_date` | 最后更新日期 | 每日目标 |
| `sf_goal_history` | 历史完成记录 | 每日目标 |

这部分数据不参与账号隔离，也不随退出登录清除。后续版本计划迁入 SQLite 并补充账号 Key 前缀。

---

## 数据备份与导出

当前版本不提供内置备份 UI。手动备份方法：

```bash
# 直接复制数据库文件
cp "%APPDATA%\ScholarFlow\data\scholarflow.db" "backup/scholarflow-$(date +%Y%m%d).db"
```

后续计划：在设置页提供"导出数据"功能，导出为 SQLite 文件或 JSON 压缩包。

---

## 未来演进方向

当前 `data_store` 使用 **key-value + JSON blob** 模式，适合现阶段快速迭代。当以下需求出现时，建议逐步拆出独立表：

| 触发条件 | 建议拆出的表 |
|----------|------------|
| 需要跨学期成绩趋势查询 | `grades(id, school_id, user_id, semester, course, score, credit, type)` |
| 需要按课程统计作业完成率 | `assignments(id, school_id, user_id, course_id, title, due_at, done_at)` |
| 需要番茄钟与课程/作业关联 | `pomodoro_sessions(id, user_id, related_type, related_id, started_at, duration_ms)` |
| 需要全局搜索 | 对上述实体表建 FTS5 虚拟表 |
| 活动记录保留策略 | `activity_log(id, user_id, app_name, window_title, started_at, duration_ms)` |

拆表时，对应的 `data_store` key 保留但标记废弃，读取逻辑优先走新表，写入只写新表，旧 key 在下一个大版本清理。
