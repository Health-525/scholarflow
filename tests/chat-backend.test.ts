import { describe, expect, it, vi } from "vitest";

import { parseOllamaStream, HttpBackend } from "@/lib/chat/backend";

// 用一组字符串块构造一个 ReadableStream（模拟 /api/chat 的流式响应体）
function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

describe("parseOllamaStream", () => {
  it("累加内容、逐 token 回调，并跳过被拆行/坏行", async () => {
    const stream = streamFromChunks([
      '{"message":{"content":"你"},"done":false}\n',
      '{"message":{"content":"好"},"done":fa', // 一行被拆到两个 chunk
      'lse}\n',
      "not-json\n", // 坏行应被跳过
      '{"done":true}\n',
    ]);
    const tokens: string[] = [];
    const full = await parseOllamaStream(stream, (d) => tokens.push(d));
    expect(full).toBe("你好");
    expect(tokens).toEqual(["你", "好"]);
  });
});

describe("HttpBackend", () => {
  it("把消息 POST 到 /api/chat 并返回流式文本", async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      body: streamFromChunks(['{"message":{"content":"hi"},"done":false}\n']),
    })) as unknown as typeof fetch;

    const backend = new HttpBackend(fakeFetch);
    const tokens: string[] = [];
    const full = await backend.send(
      [{ role: "user", content: "hello" }],
      { onToken: (d) => tokens.push(d), model: "qwen/qwen-2.5-7b-instruct" }
    );

    expect(full).toBe("hi");
    expect(tokens).toEqual(["hi"]);

    const [url, init] = (fakeFetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/chat");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.messages).toEqual([{ role: "user", content: "hello" }]);
    expect(body.stream).toBe(true);
    expect(body.model).toBe("qwen/qwen-2.5-7b-instruct");
  });

  it("响应非 ok 时抛出后端的错误信息", async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: "AI 服务离线" }),
    })) as unknown as typeof fetch;

    const backend = new HttpBackend(fakeFetch);
    await expect(backend.send([{ role: "user", content: "x" }])).rejects.toThrow("AI 服务离线");
  });
});
