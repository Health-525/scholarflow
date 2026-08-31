import { getAuthorizedAccount } from "@/lib/auth/account-access";
import { getServerDB } from "@/lib/server-db";

export interface JwglCourse {
  course: string;
  courseCode?: string;
  score: string;
  credit: string;
  type: string;
  semester: string;
}

export interface JwglGrades {
  gpa: string;
  /** 计入 GPA 的必修课学分和（GPA 分母），不是已修总学分 */
  requiredCredits: number;
  requiredCourses: number;
  allCourses: JwglCourse[];
}

export interface GPAServerData {
  grades: JwglGrades | null;
  account: { schoolId: string; userId: string } | null;
}

export async function getGPAServerData(): Promise<GPAServerData> {
  const db = getServerDB();
  const account = getAuthorizedAccount({}, db);
  if (!account) {
    return { grades: null, account: null };
  }

  const prefix = `${account.schoolId}:${account.userId}`;
  // 老库里该字段名为 totalCredits，读取时归一化到 requiredCredits，不做数据迁移。
  const raw = db.readData(`grades:${prefix}`) as
    | (Omit<JwglGrades, "requiredCredits"> & {
        requiredCredits?: number;
        /** @deprecated 旧字段名 */
        totalCredits?: number;
      })
    | null;
  return {
    grades: raw
      ? { ...raw, requiredCredits: raw.requiredCredits ?? raw.totalCredits ?? 0 }
      : null,
    account,
  };
}
