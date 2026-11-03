/**
 * 사건 저장소.
 * DATABASE_URL이 설정되면 Postgres(예: Supabase)에, 없으면 인메모리에 저장한다.
 * 스키마는 db/schema.sql 참조.
 */

import { Pool } from "pg";
import type { AppealVerdict, CaseInput, SupremeVerdict, Verdict } from "./domain/judgment";
import type { ComplaintDoc, CountersuitDoc, FilingKind } from "./domain/documents";
import type { DefenseResponse } from "./domain/response";
import type { Idea, IdeaStatus } from "./domain/ideas";

export interface CaseRecord {
  seq: number;
  input: CaseInput;
  filingKind: FilingKind;
  verdict: Verdict;
  complaint: ComplaintDoc;
  appeal: AppealVerdict | null;
  /** 대법원 상고심 — 원고가 원할 때만, 항소심 이후 한 번 */
  supreme: SupremeVerdict | null;
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

/** 운영자 화면용 이용 현황 — 사연 원문 없이 숫자만 담는다. */
export interface UsageStats {
  cases: { total: number; today: number; week: number };
  appeals: { total: number; raised: number };
  supremes: { total: number; raised: number };
  countersuits: { total: number; played: number; skipped: number; averageHits: number | null; perfect: number };
  responses: { total: number; declined: number };
  ideas: { pending: number; approved: number; private: number };
}

export interface CaseStorage {
  /** 다음 사건 번호(시퀀스). 제042호부터 시작. */
  nextSeq(): Promise<number>;
  allocateSeq(): Promise<number>;
  ready(): Promise<void>;
  setResponse(seq: number, response: DefenseResponse): Promise<boolean>;
  /** 맞고소는 사건당 한 번만 저장한다 — 동시 요청 중 하나만 true. */
  setCountersuit(seq: number, countersuit: CountersuitDoc): Promise<boolean>;
  /** 상고는 항소심이 있는 사건에 한 번만 저장한다 — 동시 요청 중 하나만 true. */
  setSupreme(seq: number, supreme: SupremeVerdict): Promise<boolean>;
  create(record: CaseRecord): Promise<void>;
  get(seq: number): Promise<CaseRecord | null>;
  update(seq: number, patch: Partial<Pick<CaseRecord, "appeal">>): Promise<void>;
  /** 전광판용 공개 가능 메타데이터. */
  board(): Promise<BoardData>;
  /** 메모판 아이디어 — 공개 요청은 pending, 비공개는 private로 들어온다. */
  addIdea(text: string, status: "pending" | "private", nickname?: string | null): Promise<Idea>;
  /** approved만 달라고 하면 공개 목록, 아니면 운영자용 전체 목록(최신순). */
  listIdeas(onlyApproved: boolean, limit: number): Promise<Idea[]>;
  countIdeas(status: IdeaStatus): Promise<number>;
  /** 비공개 아이디어는 공개 상태로 바꿀 수 없다. 바꿨으면 true. */
  reviewIdea(id: number, status: "approved" | "rejected"): Promise<boolean>;
  usageStats(): Promise<UsageStats>;
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
  async setCountersuit(seq: number, countersuit: CountersuitDoc) {
    const rec = this.cases.get(seq);
    if (!rec || rec.countersuit) return false;
    rec.countersuit = countersuit;
    return true;
  }
  async setSupreme(seq: number, supreme: SupremeVerdict) {
    const rec = this.cases.get(seq);
    if (!rec || !rec.appeal || rec.supreme) return false;
    rec.supreme = supreme;
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
  async update(seq: number, patch: Partial<Pick<CaseRecord, "appeal">>) {
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
  private ideas: Idea[] = [];
  async addIdea(text: string, status: "pending" | "private", nickname: string | null = null) {
    const idea: Idea = { id: this.ideas.length + 1, text, nickname, status, createdAt: new Date().toISOString() };
    this.ideas.push(idea);
    return idea;
  }
  async listIdeas(onlyApproved: boolean, limit: number) {
    return this.ideas.filter((i) => !onlyApproved || i.status === "approved").slice(-limit).reverse();
  }
  async countIdeas(status: IdeaStatus) {
    return this.ideas.filter((i) => i.status === status).length;
  }
  async reviewIdea(id: number, status: "approved" | "rejected") {
    const idea = this.ideas.find((i) => i.id === id);
    if (!idea || idea.status === "private") return false;
    idea.status = status;
    return true;
  }
  async usageStats(): Promise<UsageStats> {
    const all = [...this.cases.values()];
    const at = (r: CaseRecord) => this.createdAt.get(r.seq) ?? 0;
    const dayStart = new Date().setHours(0, 0, 0, 0);
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const played = all.filter((r) => r.countersuit?.objections);
    const hits = played.map((r) => r.countersuit!.objections!.hits);
    const count = (status: IdeaStatus) => this.ideas.filter((i) => i.status === status).length;
    return {
      cases: { total: all.length, today: all.filter((r) => at(r) >= dayStart).length, week: all.filter((r) => at(r) >= weekAgo).length },
      appeals: { total: all.filter((r) => r.appeal).length, raised: all.filter((r) => r.appeal?.overturned).length },
      supremes: { total: all.filter((r) => r.supreme).length, raised: all.filter((r) => r.supreme?.overturned).length },
      countersuits: {
        total: all.filter((r) => r.countersuit).length,
        played: played.length,
        skipped: all.filter((r) => r.countersuit && !r.countersuit.objections).length,
        averageHits: hits.length ? Math.round((hits.reduce((a, b) => a + b, 0) / hits.length) * 100) / 100 : null,
        perfect: hits.filter((h) => h === 3).length,
      },
      responses: { total: all.filter((r) => r.response).length, declined: all.filter((r) => r.response?.option === "decline").length },
      ideas: { pending: count("pending"), approved: count("approved"), private: count("private") },
    };
  }
}

/* ---------- Postgres ---------- */

export class PgStorage implements CaseStorage {
  private initialization: Promise<void>;
  constructor(private pool: Pool) {
    this.initialization = this.initialize();
  }
  private async initialize() {
    // IF NOT EXISTS alone can still race on Postgres catalog entries when two
    // instances create the same table. Serialize migrations per schema and keep
    // the lock, DDL, and commit on the same connection.
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext(current_schema()), hashtext('lifecourt-storage-init'))");
      await client.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS response JSONB,
        ADD COLUMN IF NOT EXISTS share_token TEXT, ADD COLUMN IF NOT EXISTS owner_token TEXT,
        ADD COLUMN IF NOT EXISTS supreme JSONB`);
      await client.query(`CREATE TABLE IF NOT EXISTS case_counters (id TEXT PRIMARY KEY, value INTEGER NOT NULL)`);
      await client.query(`CREATE TABLE IF NOT EXISTS ideas (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'private')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        reviewed_at TIMESTAMPTZ)`);
      await client.query(`ALTER TABLE ideas ADD COLUMN IF NOT EXISTS nickname TEXT`);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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
  async setCountersuit(seq: number, countersuit: CountersuitDoc) {
    const r = await this.pool.query(
      `UPDATE cases SET countersuit = $2 WHERE seq = $1 AND countersuit IS NULL RETURNING seq`,
      [seq, JSON.stringify(countersuit)]);
    return r.rowCount === 1;
  }
  async setSupreme(seq: number, supreme: SupremeVerdict) {
    const r = await this.pool.query(
      `UPDATE cases SET supreme = $2 WHERE seq = $1 AND supreme IS NULL AND appeal IS NOT NULL RETURNING seq`,
      [seq, JSON.stringify(supreme)]);
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
      supreme: row.supreme ?? null,
      countersuit: row.countersuit ?? null,
      response: row.response ?? null,
      shareToken: row.share_token ?? null,
      ownerToken: row.owner_token ?? null,
    };
  }

  async update(seq: number, patch: Partial<Pick<CaseRecord, "appeal">>) {
    if (patch.appeal !== undefined)
      await this.pool.query(`UPDATE cases SET appeal = $2 WHERE seq = $1`, [seq, JSON.stringify(patch.appeal)]);
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

  private static idea(row: { id: number; text: string; nickname: string | null; status: IdeaStatus; created_at: Date }): Idea {
    return { id: row.id, text: row.text, nickname: row.nickname ?? null, status: row.status, createdAt: row.created_at.toISOString() };
  }
  async addIdea(text: string, status: "pending" | "private", nickname: string | null = null) {
    await this.ready();
    const r = await this.pool.query(`INSERT INTO ideas (text, status, nickname) VALUES ($1, $2, $3) RETURNING *`, [text, status, nickname]);
    return PgStorage.idea(r.rows[0]);
  }
  async listIdeas(onlyApproved: boolean, limit: number) {
    await this.ready();
    const r = await this.pool.query(
      `SELECT * FROM ideas WHERE $1::boolean = false OR status = 'approved' ORDER BY id DESC LIMIT $2`,
      [onlyApproved, limit]);
    return r.rows.map(PgStorage.idea);
  }
  async countIdeas(status: IdeaStatus) {
    await this.ready();
    const r = await this.pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM ideas WHERE status = $1`, [status]);
    return r.rows[0].n;
  }
  async usageStats(): Promise<UsageStats> {
    await this.ready();
    const [c, i] = await Promise.all([
      this.pool.query(`SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')::int AS today,
          COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS week,
          COUNT(appeal)::int AS appeals,
          COUNT(*) FILTER (WHERE (appeal->>'overturned')::boolean)::int AS appeals_raised,
          COUNT(supreme)::int AS supremes,
          COUNT(*) FILTER (WHERE (supreme->>'overturned')::boolean)::int AS supremes_raised,
          COUNT(countersuit)::int AS countersuits,
          COUNT(countersuit->'objections')::int AS played,
          AVG((countersuit->'objections'->>'hits')::numeric) AS average_hits,
          COUNT(*) FILTER (WHERE (countersuit->'objections'->>'hits')::int = 3)::int AS perfect,
          COUNT(response)::int AS responses,
          COUNT(*) FILTER (WHERE response->>'option' = 'decline')::int AS declined
        FROM cases`),
      this.pool.query<{ status: IdeaStatus; n: number }>(`SELECT status, COUNT(*)::int AS n FROM ideas GROUP BY status`),
    ]);
    const s = c.rows[0];
    const idea = (status: IdeaStatus) => i.rows.find((r) => r.status === status)?.n ?? 0;
    return {
      cases: { total: s.total, today: s.today, week: s.week },
      appeals: { total: s.appeals, raised: s.appeals_raised },
      supremes: { total: s.supremes, raised: s.supremes_raised },
      countersuits: {
        total: s.countersuits,
        played: s.played,
        skipped: s.countersuits - s.played,
        averageHits: s.average_hits === null ? null : Math.round(Number(s.average_hits) * 100) / 100,
        perfect: s.perfect,
      },
      responses: { total: s.responses, declined: s.declined },
      ideas: { pending: idea("pending"), approved: idea("approved"), private: idea("private") },
    };
  }
  async reviewIdea(id: number, status: "approved" | "rejected") {
    await this.ready();
    const r = await this.pool.query(
      `UPDATE ideas SET status = $2, reviewed_at = now() WHERE id = $1 AND status <> 'private' RETURNING id`,
      [id, status]);
    return r.rowCount === 1;
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
