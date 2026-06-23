import type { LoginField } from "./types";

export interface SchoolCatalogItem {
  id: string;
  name: string;
  loginFields: LoginField[];
}

/**
 * 获取所有已注册的学校列表（纯客户端版本，不依赖服务端模块）
 * 注意：这是静态列表，新增学校需要手动更新
 */
export function getAllSchools(): SchoolCatalogItem[] {
  return [
    {
      id: "njtech",
      name: "南京工业大学",
      loginFields: [
        { key: "username", label: "学号", type: "text", required: true },
        { key: "password", label: "密码", type: "password", required: true },
      ],
    },
    {
      id: "hebau",
      name: "河北农业大学",
      loginFields: [
        { key: "username", label: "学号", type: "text", required: true },
        { key: "password", label: "密码", type: "password", required: true },
      ],
    },
  ];
}
