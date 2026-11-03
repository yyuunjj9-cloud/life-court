/**
 * 오늘의 생활법원 — API 서버.
 * 판결·문서 생성은 모두 이 서버에서 수행되고, 사건 기록은 storage(Postgres/인메모리)에 저장된다.
 */

import cors from "cors";
import express from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  generateVerdict,
  SCENARIOS,
  type CaseInput,
  type CaseType,
  type Relationship,
  type Severity,
  type Tone,
} from "./domain/judgment";
import { generateAppeal, generateSupreme } from "./domain/judgment";
import {
  COUNTER_ROUNDS,
  generateComplaint,
  generateCountersuit,
  generateCountersuitBrief,
  generateDemandLetter,
  type FilingKind,
} from "./domain/documents";
import { renderDefenseResponse, RESPONSE_OPTION_IDS } from "./domain/response";
import { createStorage } from "./storage";
import { checkStory } from "./domain/moderation";
import { IDEA_MAX, IDEA_MIN, NICKNAME_MAX, nicknameIssue, validAdminToken } from "./domain/ideas";

const CASE_TYPES: CaseType[] = ["work", "relationship", "meal", "messenger", "money", "romance", "daily"];
const RELATIONSHIPS: Relationship[] = ["self", "colleague", "friend", "family", "lover", "neighbor", "boss", "anonymous"];
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
app.param("seq", (_req, res, next, value) => {
  const seq = Number(value);
  if (!Number.isSafeInteger(seq) || seq < 1 || seq > 2_147_483_647) {
    res.status(400).json({ error: "invalid case number" });
    return;
  }
  next();
});

app.get("/api/health", async (_req, res) => {
  const dbOk = await storage.health();
  res.status(dbOk ? 200 : 503).json({ ok: dbOk, storage: storageKind, db_ok: dbOk });
});

// One policy source for the form and every document-generating endpoint.
app.post("/api/stories/check", (req, res) => {
  const story = typeof req.body?.story === "string" ? req.body.story.trim() : "";
  if (story.length < 10 || story.length > 300) {
    res.status(400).json({ error: "invalid story length" });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json({ issue: checkStory(story) });
});
app.use(["/api/cases", "/api/cases/preview", "/api/documents/demand"], (req, res, next) => {
  if (req.method !== "POST" || typeof req.body?.story !== "string") return next();
  if (req.body.story.trim().length > 300) {
    res.status(400).json({ error: "invalid story length" });
    return;
  }
  const issue = checkStory(req.body.story);
  if (!issue) return next();
  res.set("Cache-Control", "no-store");
  res.status(422).json({ error: "content rejected", code: "CONTENT_REJECTED", issue });
});

/* ---------- 업데이트 메모판 아이디어 ---------- */

/** 같은 사람이 짧은 시간에 여러 장을 붙이지 못하게 한다 — 10분에 5장. */
const IDEA_WINDOW_MS = 10 * 60 * 1000;
const IDEA_PER_WINDOW = 5;
/** 운영자가 확인하지 못한 공개 요청이 이만큼 쌓이면 잠시 받지 않는다. */
const IDEA_PENDING_CAP = 300;
const ideaPosts = new Map<string, number[]>();

function allowIdeaPost(client: string): boolean {
  const now = Date.now();
  const recent = (ideaPosts.get(client) ?? []).filter((t) => now - t < IDEA_WINDOW_MS);
  if (recent.length >= IDEA_PER_WINDOW) return false;
  recent.push(now);
  ideaPosts.set(client, recent);
  return true;
}

/** 공개 승인된 아이디어만. 원문 외의 정보(상태·작성 시각)는 내보내지 않는다. */
app.get("/api/ideas", async (_req, res) => {
  const ideas = await storage.listIdeas(true, 40);
  // 승인한 운영자가 곧바로 확인할 수 있을 만큼만 짧게 캐시한다.
  res.set("Cache-Control", "public, max-age=10");
  res.json({ ideas: ideas.map(({ id, text, nickname }) => ({ id, text, nickname })) });
});

app.post("/api/ideas", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const text = typeof body.text === "string" ? body.text.trim().replace(/\s+/g, " ") : "";
  const nickname = typeof body.nickname === "string" ? body.nickname.trim().replace(/\s+/g, " ") : "";
  if (text.length < IDEA_MIN || text.length > IDEA_MAX || typeof body.public !== "boolean"
    || (body.nickname !== undefined && typeof body.nickname !== "string") || nickname.length > NICKNAME_MAX) {
    res.status(400).json({ error: "invalid idea" });
    return;
  }
  res.set("Cache-Control", "no-store");
  const nameProblem = nickname ? nicknameIssue(nickname) : null;
  const issue = checkStory(text) ?? (nickname ? checkStory(nickname) : null)
    ?? (nameProblem ? { code: "invalid_nickname" as const, message: nameProblem } : null);
  if (issue) {
    res.status(422).json({ error: "content rejected", code: "CONTENT_REJECTED", issue });
    return;
  }
  // Render는 실제 접속 주소를 X-Forwarded-For 첫 값으로 넘긴다.
  const client = (req.get("x-forwarded-for") ?? req.ip ?? "").split(",")[0].trim();
  if (!allowIdeaPost(client) || (body.public && (await storage.countIdeas("pending")) >= IDEA_PENDING_CAP)) {
    res.status(429).json({ error: "too many ideas" });
    return;
  }
  const idea = await storage.addIdea(text, body.public ? "pending" : "private", nickname || null);
  res.status(201).json({ status: idea.status });
});

/** 운영자 전용 — 비공개 의견과 공개 요청을 모두 본다. */
app.get("/api/ideas/admin", async (req, res) => {
  if (!validAdminToken(req.get("X-Admin-Token"))) {
    res.status(403).json({ error: "invalid admin token" });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json({ ideas: await storage.listIdeas(false, 200) });
});

/** 운영자 전용 — 이용 현황 숫자. 사연 원문이나 토큰은 담지 않는다. */
app.get("/api/admin/stats", async (req, res) => {
  if (!validAdminToken(req.get("X-Admin-Token"))) {
    res.status(403).json({ error: "invalid admin token" });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json(await storage.usageStats());
});

/** 운영자 전용 — 공개 요청을 승인하거나 숨긴다. 비공개 의견은 공개할 수 없다. */
app.patch("/api/ideas/:id", async (req, res) => {
  if (!validAdminToken(req.get("X-Admin-Token"))) {
    res.status(403).json({ error: "invalid admin token" });
    return;
  }
  const id = Number(req.params.id);
  const status = ((req.body ?? {}) as Record<string, unknown>).status;
  if (!Number.isSafeInteger(id) || id < 1 || (status !== "approved" && status !== "rejected")) {
    res.status(400).json({ error: "invalid review" });
    return;
  }
  if (!(await storage.reviewIdea(id, status))) {
    res.status(404).json({ error: "idea not found or private" });
    return;
  }
  res.json({ id, status });
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

/** 유형별 죄목 목록 — 접수 전 미리보기용 공개 메타데이터. 템플릿 고정값이라 길게 캐시한다. */
app.get("/api/meta/offenses", (_req, res) => {
  res.set("Cache-Control", "public, max-age=3600");
  res.json({
    offenses: Object.fromEntries(
      Object.entries(SCENARIOS).map(([type, scenarios]) => [type, scenarios.map((scenario) => scenario.crime)]),
    ),
  });
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
  const seq = await storage.allocateSeq();
  const shareToken = randomBytes(24).toString("hex");
  const ownerToken = randomBytes(24).toString("hex");
  const verdict = generateVerdict(input, seq);
  const complaint = generateComplaint(input, verdict, filingKind as FilingKind);
  await storage.create({
    seq,
    input,
    filingKind: filingKind as FilingKind,
    verdict,
    complaint,
    appeal: null,
    supreme: null,
    countersuit: null,
    response: null,
    shareToken,
    ownerToken,
  });
  res.set("Cache-Control", "no-store");
  res.status(201).json({ seq, verdict, complaint, shareToken, ownerToken });
});

/**
 * Independent 192-bit random bearer tokens. Share tokens cannot authorize owner actions.
 * Legacy hash tokens deliberately fail closed; stored documents remain untouched.
 */
function validToken(provided: unknown, expected: string | null): boolean {
  if (typeof provided !== "string" || !expected || !/^[a-f0-9]{48}$/.test(provided)) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

app.get("/api/cases/:seq", async (req, res) => {
  const seq = Number(req.params.seq);
  const rec = await storage.get(seq);
  if (!rec) {
    res.status(404).json({ error: "case not found" });
    return;
  }
  if (!validToken(req.query.t, rec.shareToken)) {
    res.status(403).json({ error: "invalid share token" });
    return;
  }
  // 답변서는 id만 저장되므로 읽을 때 문구를 렌더링해 함께 내려준다.
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");
  res.json({ seq: rec.seq, verdict: rec.verdict, responseDoc: rec.response ? renderDefenseResponse(rec.response.option) : null });
});

/**
 * 피고 측 답변서 제출 — 공유 링크 수신자가 선택지로만 응답한다(자유 텍스트 없음).
 * 사건당 1회(선착)이며, 재판부 결정은 원심 판결을 변경하지 않는 부가 문서다.
 */
app.post("/api/cases/:seq/response", async (req, res) => {
  const seq = Number(req.params.seq);
  const rec = await storage.get(seq);
  if (!rec) {
    res.status(404).json({ error: "case not found" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!validToken(body.t, rec.shareToken)) {
    res.status(403).json({ error: "invalid share token" });
    return;
  }
  const option = String(body.option ?? "");
  if (!RESPONSE_OPTION_IDS.includes(option)) {
    res.status(400).json({ error: "invalid response option" });
    return;
  }
  if (!(await storage.setResponse(seq, { option }))) {
    const existing = (await storage.get(seq))?.response;
    // 이미 답변된 사건 — 기존 답변을 그대로 돌려준다 (선착 1회).
    res.status(409).json({ error: "already responded", responseDoc: existing ? renderDefenseResponse(existing.option) : null });
    return;
  }
  res.status(201).json({ responseDoc: renderDefenseResponse(option) });
});

/** 항소심 판결 생성 */
app.post("/api/cases/:seq/appeal", async (req, res) => {
  const seq = Number(req.params.seq);
  const rec = await storage.get(seq);
  if (!rec) {
    res.status(404).json({ error: "case not found" });
    return;
  }
  if (!validToken(req.get("X-Owner-Token"), rec.ownerToken)) {
    res.status(403).json({ error: "invalid owner token" });
    return;
  }
  const appeal = rec.appeal ?? generateAppeal(rec.input, rec.verdict);
  if (!rec.appeal) await storage.update(seq, { appeal });
  res.json({ appeal });
});

/**
 * 대법원 상고 — 원고가 원할 때만 연다. 항소심이 있어야 하고 사건당 한 번이며, 결과는 확정이다.
 * 늦은 동시 요청은 먼저 저장된 상고심을 돌려받는다.
 */
app.post("/api/cases/:seq/supreme", async (req, res) => {
  const seq = Number(req.params.seq);
  const rec = await storage.get(seq);
  if (!rec) {
    res.status(404).json({ error: "case not found" });
    return;
  }
  if (!validToken(req.get("X-Owner-Token"), rec.ownerToken)) {
    res.status(403).json({ error: "invalid owner token" });
    return;
  }
  if (!rec.appeal) {
    res.status(409).json({ error: "appeal required" });
    return;
  }
  if (rec.supreme) {
    res.json({ supreme: rec.supreme });
    return;
  }
  const supreme = generateSupreme(rec.input, rec.verdict, rec.appeal);
  if (await storage.setSupreme(seq, supreme)) {
    res.json({ supreme });
    return;
  }
  res.json({ supreme: (await storage.get(seq))?.supreme ?? supreme });
});

/**
 * 혼자 변론 게임의 궤변 3개. 조회만 하므로 맞고소를 접수하지 않는다.
 * 이미 결과가 있으면 done으로 알려 게임 없이 결과를 보여주게 한다.
 */
app.get("/api/cases/:seq/countersuit/brief", async (req, res) => {
  const seq = Number(req.params.seq);
  const rec = await storage.get(seq);
  if (!rec) {
    res.status(404).json({ error: "case not found" });
    return;
  }
  if (!validToken(req.get("X-Owner-Token"), rec.ownerToken)) {
    res.status(403).json({ error: "invalid owner token" });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json({ lines: generateCountersuitBrief(rec.input, rec.verdict), ...(rec.countersuit ? { done: true } : {}) });
});

/**
 * 피고 측 맞고소장 생성 — hits는 혼자 변론에서 막은 궤변 수(0~3), 건너뛰면 생략한다.
 * 사건당 한 번만 저장하고, 늦은 요청은 먼저 저장된 문서를 돌려받는다.
 */
app.post("/api/cases/:seq/countersuit", async (req, res) => {
  const seq = Number(req.params.seq);
  const rec = await storage.get(seq);
  if (!rec) {
    res.status(404).json({ error: "case not found" });
    return;
  }
  if (!validToken(req.get("X-Owner-Token"), rec.ownerToken)) {
    res.status(403).json({ error: "invalid owner token" });
    return;
  }
  const hits = ((req.body ?? {}) as Record<string, unknown>).hits;
  if (hits !== undefined && !(Number.isInteger(hits) && (hits as number) >= 0 && (hits as number) <= COUNTER_ROUNDS)) {
    res.status(400).json({ error: "invalid hits" });
    return;
  }
  if (rec.countersuit) {
    res.json({ countersuit: rec.countersuit });
    return;
  }
  const countersuit = generateCountersuit(rec.input, rec.verdict, hits as number | undefined);
  if (await storage.setCountersuit(seq, countersuit)) {
    res.json({ countersuit });
    return;
  }
  res.json({ countersuit: (await storage.get(seq))?.countersuit ?? countersuit });
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
storage.ready().then(() => {
  app.listen(port, () => console.log(`[life-court] API listening on :${port} (storage: ${storageKind})`));
}).catch((error) => {
  console.error("[life-court] storage initialization failed", error);
  process.exitCode = 1;
});
