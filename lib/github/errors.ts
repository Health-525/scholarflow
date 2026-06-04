export type GitHubErrorType =
  | "network_timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limit"
  | "conflict"
  | "server_error"
  | "unknown";

export interface GitHubError {
  type: GitHubErrorType;
  message: string;
  statusCode?: number;
}

export function toGitHubError(e: Response | Error | unknown): GitHubError {
  // Handle Response objects
  if (e instanceof Response) {
    const status = e.status;
    if (status === 401) return { type: "unauthorized", message: "Token 已失效或无效，请重新配置", statusCode: status };
    if (status === 403) return { type: "forbidden", message: "Token 权限不足，请重新配置", statusCode: status };
    if (status === 404) return { type: "not_found", message: "内容不存在", statusCode: status };
    if (status === 409) return { type: "conflict", message: "写入冲突，请刷新后重试", statusCode: status };
    if (status === 429) return { type: "rate_limit", message: "请求过于频繁，稍后重试", statusCode: status };
    if (status >= 500) return { type: "server_error", message: "服务端错误，稍后重试", statusCode: status };
    return { type: "unknown", message: `未知错误 (${status})`, statusCode: status };
  }

  // Handle Error objects
  if (e instanceof Error) {
    if (e.name === "AbortError" || e.message.includes("aborted") || e.message.includes("timeout")) {
      return { type: "network_timeout", message: "网络超时，请检查连接" };
    }
    if (e.message.toLowerCase().includes("network") || e.message.toLowerCase().includes("fetch")) {
      return { type: "network_timeout", message: "网络连接失败，请检查网络" };
    }
    return { type: "unknown", message: e.message || "未知错误" };
  }

  return { type: "unknown", message: "未知错误" };
}
