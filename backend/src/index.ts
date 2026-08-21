/**
 * 오늘의 생활법원 — API 서버.
 * 판결·문서 생성은 모두 이 서버에서 수행되고, 사건 기록은 storage(Postgres/인메모리)에 저장된다.
 */

import cors from "cors";
import express from "express";
import {
  generateVerdict,
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

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, storage: storageKind });
});

/** 다음 사건번호 미리보기 (09 접수 완료 화면용) */
app.get("/api/meta/next-seq", async (_req, res) => {
  res.json({ seq: await storage.nextSeq() });
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

app.get("/api/cases/:seq", async (req, res) => {
  const rec = await storage.get(Number(req.params.seq));
  if (!rec) {
    res.status(404).json({ error: "case not found" });
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
