import { resolveUserId } from "@/lib/account-prefix";

import { hasValidInternalToken } from "./origin";

interface AccountRecord {
  schoolId: string;
  userId: string;
}

interface AccountAccessDB {
  findActiveCredentials(): AccountRecord | null;
  findMostRecentCredential(): AccountRecord | null;
}

function normalize(value?: string | null): string {
  return (value ?? "").trim();
}

export function resolveAuthorizedAccount(
  request: Request,
  db: AccountAccessDB,
  requested: { schoolId?: string | null; userId?: string | null }
): AccountRecord | null {
  const requestedSchoolId = normalize(requested.schoolId);
  const requestedUserId = normalize(requested.userId) ? resolveUserId(requested.userId) : "";

  if (hasValidInternalToken(request) && requestedSchoolId && requestedUserId) {
    return { schoolId: requestedSchoolId, userId: requestedUserId };
  }

  const allowed = db.findActiveCredentials() || db.findMostRecentCredential();
  if (!allowed) return null;
  if (requestedSchoolId && requestedSchoolId !== allowed.schoolId) return null;
  if (requestedUserId && requestedUserId !== allowed.userId) return null;

  return {
    schoolId: requestedSchoolId || allowed.schoolId,
    userId: requestedUserId || allowed.userId,
  };
}
