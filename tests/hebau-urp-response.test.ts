import { describe, expect, it } from "vitest";

import { parseHebauUrpJsonResponse } from "@/lib/schools/hebau/urp-response";

describe("parseHebauUrpJsonResponse", () => {
  it("遇到登录页 HTML 时抛错，避免被当成空数据写回本地", () => {
    expect(() =>
      parseHebauUrpJsonResponse(
        { statusCode: 200, body: "<!DOCTYPE html><html><body>login</body></html>" },
        "获取河北农大课表"
      )
    ).toThrow("获取河北农大课表失败，教务系统返回了非 JSON 响应");
  });

  it("遇到无效 JSON 时抛错，避免吞掉异常响应", () => {
    expect(() =>
      parseHebauUrpJsonResponse(
        { statusCode: 200, body: "{not-json}" },
        "获取河北农大成绩"
      )
    ).toThrow("获取河北农大成绩失败，教务系统返回了无效 JSON");
  });
});
