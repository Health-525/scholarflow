function getEnvRepo(key: string, fallback: string): string {
  const envKey = `NEXT_PUBLIC_GH_REPO_${key.toUpperCase()}`;
  if (typeof process !== "undefined" && process.env?.[envKey]) {
    return process.env[envKey] as string;
  }
  return fallback;
}

export const REPOS = {
  content: getEnvRepo("content", "Health-525/jiangshu-study"),
  execution: getEnvRepo("execution", "Health-525/timetable"),
} as const;

export type RepoKey = keyof typeof REPOS;
