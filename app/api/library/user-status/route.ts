import { NextResponse } from "next/server";
import { getCachedJWT, graphql } from "../_lib";

// Check user account status (blacklist, rank, etc.)
export async function GET() {
  const jwt = getCachedJWT();
  if (!jwt) {
    return NextResponse.json({ error: "JWT_EXPIRED" }, { status: 401 });
  }

  try {
    // Query user auth info including blacklist status
    const res = await graphql(jwt, `{
      userAuth {
        reserve { reserve { status token seat_name lib_name } }
        user { rank(type: "total") { rank } }
      }
    }`);

    if (!res.ok) {
      return NextResponse.json({ error: "查询失败", details: res.data }, { status: 500 });
    }

    const userAuth = res.data?.data?.userAuth;
    return NextResponse.json({
      reserve: userAuth?.reserve?.reserve || null,
      rank: userAuth?.user?.rank?.rank || null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `请求失败: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}