import type { LoginField } from "./types";

export interface SchoolCatalogItem {
  id: string;
  name: string;
  loginFields: LoginField[];
}

export const SCHOOL_CATALOG: SchoolCatalogItem[] = [
  {
    id: "njtech",
    name: "南京工业大学",
    loginFields: [
      {
        key: "username",
        label: "学号",
        type: "text",
        placeholder: "如 202321144057",
        required: true,
      },
      {
        key: "password",
        label: "教务系统密码",
        type: "password",
        placeholder: "正方教务系统密码",
        required: true,
      },
    ],
  },
  {
    id: "hebau",
    name: "河北农业大学",
    loginFields: [
      {
        key: "username",
        label: "学号",
        type: "text",
        placeholder: "请输入学号",
        required: true,
      },
      {
        key: "password",
        label: "CAS 密码",
        type: "password",
        placeholder: "统一认证密码",
        required: true,
      },
    ],
  },
];

export function getAllSchools(): SchoolCatalogItem[] {
  return SCHOOL_CATALOG;
}
