import { NextResponse } from "next/server";

import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { markMessagesBodySchema, messagesQuerySchema } from "@/lib/schemas/library-api";

import { getCachedJWT, graphql } from "../_lib";

// GET /api/library/messages?page=1&num=20&type=1 — 查询消息通知
export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parse = messagesQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  const page = parse.success ? parse.data.page : 1;
  const num = parse.success ? parse.data.num : 20;
  const type = parse.success ? parse.data.type : 1;

  const query = `query($page: Int!, $num: Int!, $type: Int!) {
    userAuth { message { list(page: $page, num: $num, type: $type) {
      message_id title content create_time isread isused
    } } }
  }`;
  type Response = {
    errors?: Array<{ msg?: string }>;
    data?: { userAuth?: { message?: { list?: unknown[] } } };
  };
  const r = await graphql<Response>(jwt, query, { page, num, type });
  if (!r.ok || r.data.errors) {
    const msg = r.data.errors?.[0]?.msg || "请求失败";
    if (msg === "access denied!") return NextResponse.json({ error: "access_denied" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const messages = r.data.data?.userAuth?.message?.list || [];
  return NextResponse.json({ messages });
}

// POST /api/library/messages/mark-read — 标记消息已读
// body: { ids?: number[] }，不传 ids 则标记当前 type 下所有未读消息
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const parse = markMessagesBodySchema.safeParse(await request.json().catch(() => ({})));
  const body = parse.success ? parse.data : {};

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is number => typeof x === "number" && Number.isFinite(x))
    : [];

  // 如果调用方没传 ids，先拉取消息列表找出所有未读消息的 message_id
  let targetIds = ids;
  if (targetIds.length === 0) {
    const page = Math.max(1, body.page || 1);
    const num = Math.max(1, Math.min(100, body.num || 50));
    const type = body.type || 1;
    const listQuery = `query($page: Int!, $num: Int!, $type: Int!) {
      userAuth { message { list(page: $page, num: $num, type: $type) {
        message_id isread
      } } }
    }`;
    type ListResponse = {
      errors?: Array<{ msg?: string }>;
      data?: { userAuth?: { message?: { list?: Array<{ message_id?: number; isread?: number }> } } };
    };
    const listRes = await graphql<ListResponse>(jwt, listQuery, { page, num, type });
    const list = listRes.data?.data?.userAuth?.message?.list || [];
    targetIds = list.filter(m => m.isread === 0).map(m => m.message_id).filter((id): id is number => typeof id === "number");
  }

  if (targetIds.length === 0) {
    return NextResponse.json({ success: true, marked: 0 });
  }

  const query = `mutation($messageIds: [Int!]!) {
    userAuth { message { readed(messageIds: $messageIds) } }
  }`;
  type MarkResponse = {
    errors?: Array<{ msg?: string }>;
    data?: { userAuth?: { message?: { readed?: boolean } } };
  };
  const r = await graphql<MarkResponse>(jwt, query, { messageIds: targetIds });
  if (!r.ok || r.data.errors) {
    const msg = r.data.errors?.[0]?.msg || "请求失败";
    if (msg === "access denied!") return NextResponse.json({ error: "access_denied" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: r.data.data?.userAuth?.message?.readed === true, marked: targetIds.length });
}
