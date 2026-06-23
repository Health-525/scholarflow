import { getServerDB } from "@/lib/server-db";

type LoginAttemptStage = "password" | "mfa";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS: Record<LoginAttemptStage, number> = {
  password: 5,
  mfa: 6,
};

function buildKey(stage: LoginAttemptStage, schoolId: string, userId: string): string {
  return `login-rate-limit:${stage}:${schoolId}:${userId}`;
}

function readBucket(key: string): RateLimitBucket | null {
  const db = getServerDB();
  const bucket = db.readData(key) as RateLimitBucket | null;
  if (!bucket || typeof bucket.count !== "number" || typeof bucket.resetAt !== "number") {
    return null;
  }
  if (bucket.resetAt <= Date.now()) {
    db.deleteData(key);
    return null;
  }
  return bucket;
}

export function getLoginRateLimit(
  stage: LoginAttemptStage,
  schoolId: string,
  userId: string
): { limited: boolean; retryAfterSec: number } {
  const bucket = readBucket(buildKey(stage, schoolId, userId));
  if (!bucket) return { limited: false, retryAfterSec: 0 };
  if (bucket.count < RATE_LIMIT_MAX_ATTEMPTS[stage]) {
    return { limited: false, retryAfterSec: 0 };
  }
  return {
    limited: true,
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000)),
  };
}

export function recordLoginFailure(stage: LoginAttemptStage, schoolId: string, userId: string): void {
  const db = getServerDB();
  const key = buildKey(stage, schoolId, userId);
  const bucket = readBucket(key);
  if (!bucket) {
    db.writeData(key, {
      count: 1,
      resetAt: Date.now() + RATE_LIMIT_WINDOW_MS,
    } satisfies RateLimitBucket);
    return;
  }
  db.writeData(key, {
    ...bucket,
    count: bucket.count + 1,
  } satisfies RateLimitBucket);
}

export function clearLoginRateLimit(stage: LoginAttemptStage, schoolId: string, userId: string): void {
  getServerDB().deleteData(buildKey(stage, schoolId, userId));
}
