import { getAuthorizedAccount } from "@/lib/auth/account-access";
import { getServerDB } from "@/lib/server-db";
import type { RunRecord } from "@/types";

export interface RunningServerData {
  records: RunRecord[];
  account: { schoolId: string; userId: string } | null;
}

export async function getRunningServerData(): Promise<RunningServerData> {
  const db = getServerDB();
  const account = getAuthorizedAccount({}, db);
  if (!account) {
    return { records: [], account: null };
  }

  const prefix = `${account.schoolId}:${account.userId}`;
  const data = db.readData(`running:${prefix}`) as { records?: RunRecord[] } | null;
  return {
    records: data?.records ?? [],
    account,
  };
}
