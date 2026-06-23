interface UrpResponse {
  statusCode: number;
  body: string;
}

export function parseHebauUrpJsonResponse(response: UrpResponse, action: string): unknown {
  if (response.statusCode !== 200) {
    throw new Error(`${action}失败，教务系统返回状态 ${response.statusCode}`);
  }

  const body = response.body.trim();
  if (!body) {
    throw new Error(`${action}失败，教务系统返回空响应`);
  }

  if (/<(?:!DOCTYPE|html|body)\b/i.test(body)) {
    throw new Error(`${action}失败，教务系统返回了非 JSON 响应`);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${action}失败，教务系统返回了无效 JSON`);
  }
}

export function extractHebauRows(payload: unknown, datasKey?: string): Record<string, unknown>[] | null {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  if (datasKey) {
    const datas = root.datas;
    if (datas && typeof datas === "object") {
      const nested = (datas as Record<string, unknown>)[datasKey];
      if (nested && typeof nested === "object") {
        const rows = (nested as Record<string, unknown>).rows;
        if (Array.isArray(rows)) {
          return rows.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
        }
      }
    }
  }

  const data = root.data;
  if (Array.isArray(data)) {
    return data.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }
  if (data && typeof data === "object") {
    const rows = (data as Record<string, unknown>).rows;
    if (Array.isArray(rows)) {
      return rows.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    }
  }

  const rows = root.rows;
  if (Array.isArray(rows)) {
    return rows.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }

  return null;
}
