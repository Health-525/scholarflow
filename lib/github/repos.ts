export const REPOS = {
  content: "Health-525/jiangshu-study",
  execution: "Health-525/timetable",
} as const;

export type RepoKey = keyof typeof REPOS;
