import { NextRequest, NextResponse } from "next/server";

// Ollama chat API proxy — streams responses to client
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, messages, stream = true } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

    // Check if Ollama is reachable
    try {
      const healthCheck = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!healthCheck.ok) {
        return NextResponse.json({ error: "Ollama 服务不可用" }, { status: 503 });
      }
    } catch {
      return NextResponse.json({ error: "Ollama 服务离线，请确认已启动 Ollama" }, { status: 503 });
    }

    const selectedModel = model || process.env.OLLAMA_MODEL || "qwen2.5";

    if (stream) {
      // Streaming response
      const ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, messages, stream: true }),
      });

      if (!ollamaRes.ok) {
        const errText = await ollamaRes.text();
        return NextResponse.json({ error: `Ollama 错误: ${errText}` }, { status: ollamaRes.status });
      }

      // Forward the stream
      return new NextResponse(ollamaRes.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      // Non-streaming response
      const ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, messages, stream: false }),
      });

      if (!ollamaRes.ok) {
        const errText = await ollamaRes.text();
        return NextResponse.json({ error: `Ollama 错误: ${errText}` }, { status: ollamaRes.status });
      }

      const data = await ollamaRes.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    return NextResponse.json(
      { error: `请求失败: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

// GET — list available models
export async function GET() {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) {
      return NextResponse.json({ error: "Ollama 服务不可用", online: false }, { status: 503 });
    }
    const data = await res.json();
    return NextResponse.json({ online: true, models: data.models || [] });
  } catch {
    return NextResponse.json({ error: "Ollama 服务离线", online: false }, { status: 503 });
  }
}