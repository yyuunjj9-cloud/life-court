/**
 * 오늘의 생활법원 — API 서버.
 * 판결·문서 생성은 모두 이 서버에서 수행되고, 사건 기록은 storage(Postgres/인메모리)에 저장된다.
 */

import cors from "cors";
import express from "express";
import {
  generateVerdict,
  hashSeed,
  type CaseInput,
  type CaseType,
  type Relationship,
  type Severity,
  type Tone,
} from "./domain/judgment";
import { generateAppeal } from "./domain/judgment";
import {
  generateComplaint,
  generateCountersuit,
  generateDemandLetter,
  type FilingKind,
} from "./domain/documents";
import { createStorage } from "./storage";

const CASE_TYPES: CaseType[] = ["work", "relationship", "meal", "messenger", "daily"];
const RELATIONSHIPS: Relationship[] = ["self", "colleague", "friend", "boss", "anonymous"];
const TONES: Tone[] = ["lenient", "fair", "strict"];
const FILING_KINDS: FilingKind[] = ["complaint", "accusation"];

/** 요청 본문에서 사건 입력을 검증해 꺼낸다. 실패 시 null. */
function parseCaseInput(body: unknown): CaseInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const story = typeof b.story === "string" ? b.story.trim() : "";
  const severity = Number(b.severity);
  if (story.length < 10 || story.length > 300) return null;
  if (!CASE_TYPES.includes(b.caseType as CaseType)) return null;
  if (!RELATIONSHIPS.includes(b.relationship as Relationship)) return null;
  if (!TONES.includes(b.tone as Tone)) return null;
  if (![1, 2, 3, 4, 5].includes(severity)) return null;
  return {
    story,
    caseType: b.caseType as CaseType,
    relationship: b.relationship as Relationship,
    severity: severity as Severity,
    tone: b.tone as Tone,
  };
}

const { storage, kind: storageKind } = createStorage();
const app = express();

// CORS: CORS_ORIGINS(쉼표 목록)와 CORS_ORIGIN_REGEX 중 하나라도 설정되면 그 규칙으로 제한하고,
// 둘 다 없으면(로컬 개발) 전체 허용한다.
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const originRegex = process.env.CORS_ORIGIN_REGEX ? new RegExp(process.env.CORS_ORIGIN_REGEX) : null;
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/서버 간 호출
      if (allowedOrigins.length === 0 && !originRegex) return cb(null, true);
      if (allowedOrigins.includes(origin) || (originRegex !== null && originRegex.test(origin)))
        return cb(null, true);
      return cb(null, false);
    },
  }),
);
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const dbOk = await storage.health();
  res.status(dbOk ? 200 : 503).json({ ok: dbOk, storage: storageKind, db_ok: dbOk });
});

/** 다음 사건번호 미리보기 (09 접수 완료 화면용) */
app.get("/api/meta/next-seq", async (_req, res) => {
  res.json({ seq: await storage.nextSeq() });
});

/** 랜딩 전광판 — 공개 가능한 메타데이터만. DB 보호를 위해 60초 캐시한다. */
let boardCache: { data: unknown; at: number } | null = null;
app.get("/api/board", async (_req, res) => {
  try {
    if (!boardCache || Date.now() - boardCache.at > 60_000) {
      boardCache = { data: await storage.board(), at: Date.now() };
    }
    res.json(boardCache.data);
  } catch {
    res.status(503).json({ error: "board unavailable" });
  }
});

/**
 * 공유 링크 재현: 입력+사건번호로 판결을 저장 없이 재생성한다.
 * 같은 입력이면 같은 판결이 나오므로, 링크를 받은 사람은 원본과 동일한 판결문을 본다.
 */
app.post("/api/cases/preview", (req, res) => {
  const input = parseCaseInput(req.body);
  const seq = Number((req.body as Record<string, unknown>)?.seq);
  if (!input || !Number.isInteger(seq) || seq < 1 || seq > 1_000_000) {
    res.status(400).json({ error: "invalid case input" });
    return;
  }
  res.json({ verdict: generateVerdict(input, seq) });
});

/** 사건 접수: 판결과 고소/고발장을 확정하고 저장한다. */
app.post("/api/cases", async (req, res) => {
  const input = parseCaseInput(req.body);
  const filingKind = (req.body as Record<string, unknown>)?.filingKind;
  if (!input || !FILING_KINDS.includes(filingKind as FilingKind)) {
    res.status(400).json({ error: "invalid case input" });
    return;
  }
  const seq = await storage.nextSeq();
  const verdict = generateVerdict(input, seq);
  const complaint = generateComplaint(input, verdict, filingKind as FilingKind);
  await storage.create({
    seq,
    input,
    filingKind: filingKind as FilingKind,
    verdict,
    complaint,
    appeal: null,
    countersuit: null,
  });
  res.status(201).json({ seq, verdict, complaint });
});

/**
 * 공유 토큰: 사연 내용을 아는 사람만 만들 수 있다(프런트 share.ts와 동일 공식).
 * 사건번호가 순번이라도 토큰 없이는 타인의 기록을 열람할 수 없다.
 */
function shareTokenFor(seq: number, story: string): string {
  return hashSeed(`share|${seq}|${story}`).toString(36);
}

app.get("/api/cases/:seq", async (req, res) => {
  const seq = Number(req.params.seq);
  const rec = await storage.get(seq);
  if (!rec) {
    res.status(404).json({ error: "case not found" });
    return;
  }
  if (String(req.query.t ?? "") !== shareTokenFor(seq, rec.input.story)) {
    res.status(403).json({ error: "invalid share token" });
    return;
  }
  res.json(rec);
});

/** 항소심 판결 생성 */
app.post("/api/cases/:seq/appeal", async (req, res) => {
  const seq = Number(req.params.seq);
  const rec = await storage.get(seq);
  if (!rec) {
    res.status(404).json({ error: "case not found" });
    return;
  }
  const appeal = rec.appeal ?? generateAppeal(rec.input, rec.verdict);
  if (!rec.appeal) await storage.update(seq, { appeal });
  res.json({ appeal });
});

/** 피고 측 맞고소장 생성 */
app.post("/api/cases/:seq/countersuit", async (req, res) => {
  const seq = Number(req.params.seq);
  const rec = await storage.get(seq);
  if (!rec) {
    res.status(404).json({ error: "case not found" });
    return;
  }
  const countersuit = rec.countersuit ?? generateCountersuit(rec.input, rec.verdict);
  if (!rec.countersuit) await storage.update(seq, { countersuit });
  res.json({ countersuit });
});

/** 내용증명 생성 (사건 접수 전 단계 — 저장하지 않는다) */
app.post("/api/documents/demand", (req, res) => {
  const input = parseCaseInput(req.body);
  if (!input) {
    res.status(400).json({ error: "invalid case input" });
    return;
  }
  res.json({ demand: generateDemandLetter(input) });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[life-court] API listening on :${port} (storage: ${storageKind})`);
});
