import { getAuthorizedAccount } from "@/lib/auth/account-access";
import { getServerDB } from "@/lib/server-db";

export interface JwglCourse {
  course: string;
  score: string;
  credit: string;
  type: string;
  semester: string;
}

export interface JwglGrades {
  gpa: string;
  totalCredits: number;
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
  const data = db.readData(`grades:${prefix}`) as JwglGrades | null;
  return {
    grades: data,
    account,
  };
}
