import { getAllSchools as getRegisteredSchools } from "./registry";
import type { LoginField } from "./types";

export interface SchoolCatalogItem {
  id: string;
  name: string;
  loginFields: LoginField[];
}

export function getAllSchools(): SchoolCatalogItem[] {
  return getRegisteredSchools().map((school) => ({
    id: school.id,
    name: school.name,
    loginFields: school.loginFields,
  }));
}
