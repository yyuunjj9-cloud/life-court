/**
 * 사건 저장소.
 * DATABASE_URL이 설정되면 Postgres(예: Supabase)에, 없으면 인메모리에 저장한다.
 * 스키마는 db/schema.sql 참조.
 */

import { Pool } from "pg";
import type { AppealVerdict, CaseInput, Verdict } from "./domain/judgment";
import type { ComplaintDoc, CountersuitDoc, FilingKind } from "./domain/documents";
import type { DefenseResponse } from "./domain/response";

export interface CaseRecord {
  seq: number;
  input: CaseInput;
  filingKind: FilingKind;
  verdict: Verdict;
  complaint: ComplaintDoc;
  appeal: AppealVerdict | null;
  countersuit: CountersuitDoc | null;
  /** 피고 측 답변서(선택지 기반, 사건당 1회) — 공유 링크 수신자가 제출 */
  response: DefenseResponse | null;
  shareToken: string | null;
  ownerToken: string | null;
}

/** 전광판 항목 — 사연 원문 등 개인 맥락 없이 템플릿 산출물만 담는다 (안내 제2조 준수). */
export interface BoardEntry {
  caseNo: string;
  crime: string;
  result: string;
}

export interface BoardData {
  recent: BoardEntry[];
  totalCount: number;
  todayCount: number;
  /** 최근 7일 최다 죄목 */
  topCrime: string | null;
}

export interface CaseStorage {
  /** 다음 사건 번호(시퀀스). 제042호부터 시작. */
  nextSeq(): Promise<number>;
  allocateSeq(): Promise<number>;
  ready(): Promise<void>;
  setResponse(seq: number, response: DefenseResponse): Promise<boolean>;
  create(record: CaseRecord): Promise<void>;
  get(seq: number): Promise<CaseRecord | null>;
  update(seq: number, patch: Partial<Pick<CaseRecord, "appeal" | "countersuit">>): Promise<void>;
  /** 전광판용 공개 가능 메타데이터. */
  board(): Promise<BoardData>;
  /** DB를 실제로 조회해 살아있는지 확인한다 (keep-alive가 Supabase 활동으로 집계되도록). */
  health(): Promise<boolean>;
}

const SEQ_START = 41; // 첫 사건이 제042호

/* ---------- 인메모리 (로컬 개발용) ---------- */

export class MemoryStorage implements CaseStorage {
  private cases = new Map<number, CaseRecord>();
  private createdAt = new Map<number, number>();
  private seq = SEQ_START;

  async nextSeq() {
    return this.seq + 1;
  }
  async allocateSeq() { return ++this.seq; }
  async ready() {}
  async setResponse(seq: number, response: DefenseResponse) {
    const rec = this.cases.get(seq);
    if (!rec || rec.response) return false;
    rec.response = response;
    return true;
  }
  async create(record: CaseRecord) {
    this.seq = Math.max(this.seq, record.seq);
    this.cases.set(record.seq, record);
    this.createdAt.set(record.seq, Date.now());
  }
  async get(seq: number) {
    return this.cases.get(seq) ?? null;
  }
  async update(seq: number, patch: Partial<Pick<CaseRecord, "appeal" | "countersuit">>) {
    const rec = this.cases.get(seq);
    if (rec) Object.assign(rec, patch);
  }
  async board(): Promise<BoardData> {
    const all = [...this.cases.values()].sort((a, b) => b.seq - a.seq);
    const dayStart = new Date().setHours(0, 0, 0, 0);
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const crimeCount = new Map<string, number>();
    for (const rec of all) {
      if ((this.createdAt.get(rec.seq) ?? 0) >= weekAgo) {
        crimeCount.set(rec.verdict.crime, (crimeCount.get(rec.verdict.crime) ?? 0) + 1);
      }
    }
    const topCrime = [...crimeCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return {
      recent: all.slice(0, 8).map((r) => ({ caseNo: r.verdict.caseNo, crime: r.verdict.crime, result: r.verdict.result })),
      totalCount: all.length,
      todayCount: all.filter((r) => (this.createdAt.get(r.seq) ?? 0) >= dayStart).length,
      topCrime,
    };
  }
  async health() {
    return true;
  }
}

/* ---------- Postgres ---------- */

export class PgStorage implements CaseStorage {
  private initialization: Promise<void>;
  constructor(private pool: Pool) {
    this.initialization = this.initialize();
  }
  private async initialize() {
    await this.pool.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS response JSONB,
      ADD COLUMN IF NOT EXISTS share_token TEXT, ADD COLUMN IF NOT EXISTS owner_token TEXT`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS case_counters (id TEXT PRIMARY KEY, value INTEGER NOT NULL)`);
  }
  async ready() { await this.initialization; }
  async allocateSeq() {
    await this.ready();
    const r = await this.pool.query<{ value: number }>(
      `INSERT INTO case_counters (id, value)
       SELECT 'cases', COALESCE(MAX(seq), $1)::int + 1 FROM cases
       ON CONFLICT (id) DO UPDATE SET value = GREATEST(case_counters.value,
         (SELECT COALESCE(MAX(seq), $1)::int FROM cases)) + 1 RETURNING value`, [SEQ_START]);
    return r.rows[0].value;
  }
  async setResponse(seq: number, response: DefenseResponse) {
    const r = await this.pool.query(
      `UPDATE cases SET response = $2 WHERE seq = $1 AND response IS NULL RETURNING seq`,
      [seq, JSON.stringify(response)]);
    return r.rowCount === 1;
  }

  async nextSeq() {
    await this.ready();
    const r = await this.pool.query<{ next: number }>(
      `SELECT GREATEST(COALESCE(MAX(seq), $1),
        COALESCE((SELECT value FROM case_counters WHERE id = 'cases'), $1))::int + 1 AS next FROM cases`,
      [SEQ_START],
    );
    return r.rows[0].next;
  }

  async create(rec: CaseRecord) {
    await this.pool.query(
      `INSERT INTO cases (seq, case_no, story, case_type, relationship, severity, tone, filing_kind, verdict, complaint, share_token, owner_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        rec.seq,
        rec.verdict.caseNo,
        rec.input.story,
        rec.input.caseType,
        rec.input.relationship,
        rec.input.severity,
        rec.input.tone,
        rec.filingKind,
        JSON.stringify(rec.verdict),
        JSON.stringify(rec.complaint),
        rec.shareToken,
        rec.ownerToken,
      ],
    );
  }

  async get(seq: number): Promise<CaseRecord | null> {
    const r = await this.pool.query(`SELECT * FROM cases WHERE seq = $1`, [seq]);
    const row = r.rows[0];
    if (!row) return null;
    return {
      seq: row.seq,
      input: {
        story: row.story,
        caseType: row.case_type,
        relationship: row.relationship,
        severity: row.severity,
        tone: row.tone,
      },
      filingKind: row.filing_kind,
      verdict: row.verdict,
      complaint: row.complaint,
      appeal: row.appeal ?? null,
      countersuit: row.countersuit ?? null,
      response: row.response ?? null,
      shareToken: row.share_token ?? null,
      ownerToken: row.owner_token ?? null,
    };
  }

  async update(seq: number, patch: Partial<Pick<CaseRecord, "appeal" | "countersuit">>) {
    if (patch.appeal !== undefined)
      await this.pool.query(`UPDATE cases SET appeal = $2 WHERE seq = $1`, [seq, JSON.stringify(patch.appeal)]);
    if (patch.countersuit !== undefined)
      await this.pool.query(`UPDATE cases SET countersuit = $2 WHERE seq = $1`, [
        seq,
        JSON.stringify(patch.countersuit),
      ]);
  }

  async board(): Promise<BoardData> {
    // 사연 원문·관계 등 개인 맥락 컬럼은 선택하지 않는다 — 템플릿 산출물만 공개.
    const [recent, counts, top] = await Promise.all([
      this.pool.query<BoardEntry>(
        `SELECT verdict->>'caseNo' AS "caseNo", verdict->>'crime' AS crime, verdict->>'result' AS result
         FROM cases ORDER BY seq DESC LIMIT 8`,
      ),
      this.pool.query<{ total: number; today: number }>(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (
                  WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
                )::int AS today
         FROM cases`,
      ),
      this.pool.query<{ crime: string }>(
        `SELECT verdict->>'crime' AS crime FROM cases
         WHERE created_at >= now() - interval '7 days'
         GROUP BY 1 ORDER BY COUNT(*) DESC, 1 LIMIT 1`,
      ),
    ]);
    return {
      recent: recent.rows,
      totalCount: counts.rows[0]?.total ?? 0,
      todayCount: counts.rows[0]?.today ?? 0,
      topCrime: top.rows[0]?.crime ?? null,
    };
  }

  async health() {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }
}

export function createStorage(): { storage: CaseStorage; kind: "postgres" | "memory" } {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Render free(512MB) + Supabase Session Pooler 기준으로 풀을 작게 유지한다.
    const pool = new Pool({ connectionString: url, min: 1, max: 4, connectionTimeoutMillis: 10_000 });
    return { storage: new PgStorage(pool), kind: "postgres" };
  }
  return { storage: new MemoryStorage(), kind: "memory" };
}
