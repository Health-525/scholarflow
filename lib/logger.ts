/**
 * 统一日志工具。
 * 生产环境只保留 error，开发环境保留所有级别。
 * 前端 console 同时受 next.config.js removeConsole 控制，这里保证 SSR / API / Electron 预加载之外的一致性。
 */
/* eslint-disable no-console */
const isDev = process.env.NODE_ENV === "development";

function noop() {
  // no-op
}

export const logger = {
  debug: isDev ? console.debug : noop,
  log: isDev ? console.log : noop,
  info: isDev ? console.info : noop,
  warn: isDev ? console.warn : noop,
  error: console.error,
};
