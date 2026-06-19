import Database from "better-sqlite3";

/**
 * 打开 SQLite 数据库连接。
 * `new Database(...)` 用 try/catch 包裹,加载/初始化失败时输出可定位信息
 * (db 文件、运行时 ABI/版本、错误栈),便于区分 ABI 不匹配与文件缺失,然后抛出。
 */
export function openSqlite(dbFile: string): Database.Database {
  try {
    return new Database(dbFile);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      "[ServerDB] failed to load better-sqlite3 native module.",
      "dbFile=", dbFile,
      "electron=", process.versions.electron,
      "modules(ABI)=", process.versions.modules,
      "node=", process.versions.node,
      "error=", (err as Error).stack || (err as Error).message
    );
    throw err;
  }
}

/**
 * 转义 SQL `LIKE` 模式中的特殊字符(`%`、`_`、转义符自身),配合 `ESCAPE '\'` 使用。
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
