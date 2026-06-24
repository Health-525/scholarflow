/**
 * Normalize raw activity_segment rows for display / aggregation.
 *
 * - Merge adjacent segments when they share the same type/app/category/domain/project
 *   and the gap between them is <= MERGE_GAP_MS.
 * - Drop app segments shorter than MIN_APP_SEGMENT_MS to remove polling noise.
 *
 * This is intentionally written in plain JS so both the Next.js API layer
 * (lib/activity/db.ts) and the Electron main process can share it.
 */

'use strict';

const MIN_APP_SEGMENT_MS = 3000;
const MERGE_GAP_MS = 3000;

/**
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<{ id?: number, type: string, app: string | null, title: string | null, domain: string | null, category: string | null, project: string | null, begin_at: number, end_at: number | null }>}
 */
function normalizeSegments(rows) {
  if (rows.length === 0) return [];

  const sorted = [...rows].sort((a, b) => Number(a.begin_at) - Number(b.begin_at));
  /** @type {Array<{ id?: number, type: string, app: string | null, title: string | null, domain: string | null, category: string | null, project: string | null, begin_at: number, end_at: number | null }>} */
  const merged = [];

  for (const row of sorted) {
    const current = {
      id: typeof row.id === 'number' ? row.id : undefined,
      type: String(row.type),
      app: row.app ? String(row.app) : null,
      title: row.title ? String(row.title) : null,
      domain: row.domain ? String(row.domain) : null,
      category: row.category ? String(row.category) : null,
      project: row.project ? String(row.project) : null,
      begin_at: Number(row.begin_at),
      end_at: row.end_at != null ? Number(row.end_at) : null,
    };

    const prev = merged[merged.length - 1];
    if (prev) {
      const same =
        current.type === prev.type &&
        current.app === prev.app &&
        current.category === prev.category &&
        current.domain === prev.domain &&
        current.project === prev.project;
      const gap = current.begin_at - (prev.end_at ?? Date.now());
      if (same && gap >= 0 && gap <= MERGE_GAP_MS) {
        prev.end_at = current.end_at ?? Date.now();
        if (current.id != null) prev.id = current.id;
        continue;
      }
    }

    merged.push(current);
  }

  return merged.filter((seg) => {
    if (seg.type !== 'app') return true;
    const duration = (seg.end_at ?? Date.now()) - seg.begin_at;
    return duration >= MIN_APP_SEGMENT_MS;
  });
}

module.exports = { normalizeSegments };
