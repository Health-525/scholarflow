export interface NormalizedSegment {
  id?: number;
  type: string;
  app: string | null;
  title: string | null;
  domain: string | null;
  category: string | null;
  project: string | null;
  begin_at: number;
  end_at: number | null;
}

export interface RawSegmentRow extends Record<string, unknown> {
  id?: number;
  type: string;
  app?: string | null;
  title?: string | null;
  domain?: string | null;
  category?: string | null;
  project?: string | null;
  begin_at: number;
  end_at?: number | null;
}

export function normalizeSegments(rows: RawSegmentRow[]): NormalizedSegment[];
