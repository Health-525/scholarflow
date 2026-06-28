import { resolveUserId } from "@/lib/account-prefix";
import type { ServerDB } from "@/lib/server-db";

interface RequestedAccount {
  schoolId?: string | null;
  userId?: string | null;
}

interface AuthorizedAccount {
  schoolId: string;
  userId: string;
}

function normalize(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeUserId(value?: string | null): string | null {
  const trimmed = normalize(value);
  return trimmed ? resolveUserId(trimmed) : null;
}

export function getAuthorizedAccount(
  requested: RequestedAccount,
  db: ServerDB
): AuthorizedAccount | null {
  const active = db.findActiveCredentials();
  const recent = db.findMostRecentCredential();
  const current = active || recent;

  if (!current) {
    return null;
  }

  const schoolId = normalize(requested.schoolId);
  const userId = normalizeUserId(requested.userId);

  if (schoolId && schoolId !== current.schoolId) {
    return null;
  }
  if (userId && userId !== current.userId) {
    return null;
  }

  return {
    schoolId: current.schoolId,
    userId: current.userId,
  };
}

export function getAuthorizedSchoolId(
  requestedSchoolId: string | null | undefined,
  db: ServerDB
): string | null {
  const account = getAuthorizedAccount({ schoolId: requestedSchoolId }, db);
  return account?.schoolId ?? null;
}

export function getAuthorizedPrefix(
  schoolId: string | null | undefined,
  userId: string | null | undefined,
  db: ServerDB,
): string {
  const account = getAuthorizedAccount({ schoolId, userId }, db);
  if (!account) throw new Error("unauthorized account access");
  return `${account.schoolId}:${account.userId}`;
}

