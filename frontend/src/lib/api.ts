/**
 * backend API 클라이언트.
 * 기본 주소는 로컬 백엔드(4000). 배포 시 NEXT_PUBLIC_API_URL로 지정한다.
 *
 * - Render 무료 티어 콜드스타트(30~60초)와 간헐 라우팅 404를 백오프 재시도로 흡수한다.
 * - 직접 연결이 네트워크 수준에서 계속 실패하면(통신사 차단·DNS 문제 등)
 *   같은 도메인의 Vercel 프록시 경로(/backend/*)로 자동 전환한다.
 * - 재시도 진행 상황을 구독할 수 있어 UI가 진행 바를 그릴 수 있다.
 */

import type { AppealVerdict, CaseInput, CaseType, SupremeVerdict, Verdict } from "@/domain/judgment";
import type { ComplaintDoc, CountersuitDoc, DemandLetterDoc, FilingKind } from "@/domain/documents";
import type { DefenseResponseDoc } from "@/domain/response";
import type { ModerationIssue } from "@/domain/moderation";
import type { CounterRound } from "@/domain/countersuit-game";

export interface ScenarioChoices {
  pick: { name: string; crime: string; general: boolean };
  alternatives: { name: string; crime: string }[];
}

export class ApiError extends Error {
  constructor(path: string, public status: number, public issue: ModerationIssue | null = null) {
    super(`API ${path} failed: ${status}`);
  }
}

// trim(): 환경변수에 BOM(U+FEFF)이 섞여 들어와 직접 연결 URL이 깨진 사례가 있다.
const DIRECT_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").trim();
/** next.config.mjs rewrites가 /backend/* 를 백엔드로 프록시한다. */
const PROXY_BASE = "/backend";
/**
 * 운영 환경 브라우저에서는 같은 도메인 프록시를 기본 경로로 쓴다.
 * 일부 모바일 통신망/CDN 엣지에서 onrender.com 직접 연결이 지속적으로
 * no-server 404를 반환하는 사례가 있어, 재시도마다 프록시↔직접을 번갈아 시도한다.
 */
const PROXY_PRIMARY = typeof window !== "undefined" && Boolean(process.env.NEXT_PUBLIC_API_URL);

function baseFor(attempt: number): string {
  if (!PROXY_PRIMARY) return DIRECT_BASE;
  return attempt % 2 === 0 ? PROXY_BASE : DIRECT_BASE;
}

/** 서버 도달 전 실패(라우팅 404) 또는 게이트웨이 오류만 재시도한다. */
const RETRYABLE_STATUS = new Set([404, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 3000, 4000, 6000, 8000, 10000, 12000];

/* ---------- 연결 상태 구독 (진행 바 UI용) ---------- */

export interface ConnState {
  phase: "idle" | "connecting" | "failed";
  startedAt: number;
  attempt: number;
  error?: string;
}

let connState: ConnState = { phase: "idle", startedAt: 0, attempt: 0 };
const connListeners = new Set<(s: ConnState) => void>();

function setConn(next: ConnState) {
  connState = next;
  connListeners.forEach((fn) => fn(next));
}

/** 현재 상태를 즉시 1회 전달하고, 이후 변경을 구독한다. 반환값은 구독 해제 함수. */
export function subscribeConnection(fn: (s: ConnState) => void): () => void {
  fn(connState);
  connListeners.add(fn);
  return () => {
    connListeners.delete(fn);
  };
}

/* ---------- 요청 ---------- */

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function describeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let lastError: unknown = null;
  const startedAt = Date.now();

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(`${baseFor(attempt)}${path}`, {
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(12_000),
        headers: { "Content-Type": "application/json", ...init?.headers },
      });
      if (res.ok) {
        setConn({ phase: "idle", startedAt: 0, attempt: 0 });
        return (await res.json()) as T;
      }
      if (!RETRYABLE_STATUS.has(res.status)) {
        setConn({ phase: "idle", startedAt: 0, attempt: 0 });
        const payload = await res.json().catch(() => null);
        throw new ApiError(path, res.status, payload?.code === "CONTENT_REJECTED" ? payload.issue ?? null : null);
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      lastError = e;
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      setConn({ phase: "connecting", startedAt, attempt: attempt + 1 });
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  setConn({ phase: "failed", startedAt, attempt: RETRY_DELAYS_MS.length, error: describeError(lastError) });
  throw lastError instanceof Error ? lastError : new Error(`API ${path} failed`);
}

export const api = {
  checkStory: (story: string) => request<{ issue: ModerationIssue | null }>("/api/stories/check", {
    method: "POST", body: JSON.stringify({ story }),
  }),
  /** 사건 특정: 재판부가 고른 사건과 다른 후보. 저장하지 않는다. */
  scenarioChoices: (story: string, caseType: CaseType) => request<ScenarioChoices>("/api/stories/scenario", {
    method: "POST", body: JSON.stringify({ story, caseType }),
  }),
  submitCase: (input: CaseInput, filingKind: FilingKind) =>
    request<{ seq: number; verdict: Verdict; complaint: ComplaintDoc; shareToken: string; ownerToken: string }>("/api/cases", {
      method: "POST",
      body: JSON.stringify({ ...input, filingKind }),
    }),

  fileAppeal: (seq: number, ownerToken: string) =>
    request<{ appeal: AppealVerdict }>(`/api/cases/${seq}/appeal`, { method: "POST", headers: { "X-Owner-Token": ownerToken } }),

  /** 대법원 상고 — 항소심 뒤 원고가 원할 때 한 번. */
  fileSupreme: (seq: number, ownerToken: string) =>
    request<{ supreme: SupremeVerdict }>(`/api/cases/${seq}/supreme`, { method: "POST", headers: { "X-Owner-Token": ownerToken } }),

  /** 반박 카드 게임의 라운드와 기각에 필요한 정답 수 — 조회만 하므로 맞고소가 접수되지 않는다. */
  countersuitBrief: (seq: number, ownerToken: string) =>
    request<{ rounds: CounterRound[]; needed: number; done?: true }>(`/api/cases/${seq}/countersuit/brief`, {
      headers: { "X-Owner-Token": ownerToken },
    }),

  /** picks는 라운드마다 고른 카드 위치 — 맞힌 수는 서버가 계산한다. 건너뛰면 생략한다. */
  fileCountersuit: (seq: number, ownerToken: string, picks?: number[]) =>
    request<{ countersuit: CountersuitDoc }>(`/api/cases/${seq}/countersuit`, {
      method: "POST",
      headers: { "X-Owner-Token": ownerToken },
      body: JSON.stringify(picks === undefined ? {} : { picks }),
    }),

  createDemandLetter: (input: CaseInput) =>
    request<{ demand: DemandLetterDoc }>("/api/documents/demand", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** 공유 링크 재현 — 저장 없이 입력+사건번호로 같은 판결을 다시 만든다. */
  previewVerdict: (input: CaseInput, seq: number) =>
    request<{ verdict: Verdict }>("/api/cases/preview", {
      method: "POST",
      body: JSON.stringify({ ...input, seq }),
    }),

  /** 피고 측 답변서 제출 — 공유 링크 수신자가 선택지로 응답한다. 사건당 1회. */
  submitDefense: (seq: number, token: string, option: string) =>
    request<{ responseDoc: DefenseResponseDoc }>(`/api/cases/${seq}/response`, {
      method: "POST",
      body: JSON.stringify({ t: token, option }),
    }),

  nextSeq: () => request<{ seq: number }>("/api/meta/next-seq"),

  health: () => request<{ ok: boolean; db_ok: boolean }>("/api/health"),
};

/* ---------- 전광판 (장식용 — 실패해도 조용히 넘어간다) ---------- */

export interface BoardEntry {
  caseNo: string;
  crime: string;
  result: string;
}

export interface BoardData {
  recent: BoardEntry[];
  totalCount: number;
  todayCount: number;
  topCrime: string | null;
}

/**
 * 유형별 죄목 미리보기. 전광판처럼 장식용이라 재시도·연결 배너 없이 조용히 실패한다.
 */
export async function fetchOffenses(): Promise<Record<string, string[]> | null> {
  for (const base of [PROXY_BASE, DIRECT_BASE]) {
    try {
      const res = await fetch(`${base}/api/meta/offenses`);
      if (res.ok) return ((await res.json()) as { offenses: Record<string, string[]> }).offenses;
    } catch {
      /* 다음 경로 시도 */
    }
  }
  return null;
}

/* ---------- 업데이트 메모판 아이디어 ---------- */

export interface PublicIdea {
  id: number;
  text: string;
  nickname: string | null;
}

export interface AdminIdea extends PublicIdea {
  status: "pending" | "approved" | "rejected" | "private";
  createdAt: string;
}

/** 운영자가 승인한 아이디어. 장식처럼 조용히 실패한다. */
export async function fetchIdeas(): Promise<PublicIdea[] | null> {
  for (const base of [PROXY_BASE, DIRECT_BASE]) {
    try {
      const res = await fetch(`${base}/api/ideas`);
      if (res.ok) return ((await res.json()) as { ideas: PublicIdea[] }).ideas;
    } catch {
      /* 다음 경로 시도 */
    }
  }
  return null;
}

/* ---------- 생활 배심원단 ---------- */

export type JuryVote = "guilty" | "not_guilty";

export interface JuryTally {
  guilty: number;
  notGuilty: number;
  mine: JuryVote | null;
}

const VOTER_KEY = "lifecourt.voterId";
let memoryVoter: string | null = null;

/** 이 기기의 투표자 표시 — 개인을 알아볼 수 없는 난수다. 저장할 수 없으면 이번 방문 동안만 쓴다. */
export function voterId(): string {
  try {
    const saved = window.localStorage.getItem(VOTER_KEY);
    if (saved && /^[a-f0-9]{32}$/.test(saved)) return saved;
  } catch {
    /* 저장소를 쓸 수 없는 브라우저 */
  }
  if (!memoryVoter) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    memoryVoter = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  try {
    window.localStorage.setItem(VOTER_KEY, memoryVoter);
  } catch {
    /* 이번 방문 동안만 쓴다 */
  }
  return memoryVoter;
}

export const juryApi = {
  /** 공유 링크로 볼 때 — 이 기기의 표도 함께 받는다. */
  tally: (seq: number, token: string, voter: string) =>
    request<JuryTally>(`/api/cases/${seq}/jury?t=${encodeURIComponent(token)}&voter=${voter}`),
  /** 사건을 낸 사람이 볼 때 — 집계만. */
  ownerTally: (seq: number, ownerToken: string) =>
    request<JuryTally>(`/api/cases/${seq}/jury`, { headers: { "X-Owner-Token": ownerToken } }),
  /** 이미 투표한 기기면 409가 나므로, 그때는 집계를 다시 읽는다. */
  vote: (seq: number, token: string, voter: string, vote: JuryVote) =>
    request<JuryTally>(`/api/cases/${seq}/jury`, { method: "POST", body: JSON.stringify({ t: token, voter, vote }) }),
};

/** 운영자 화면 이용 현황 — 숫자만 담는다. */
export interface UsageStats {
  cases: { total: number; today: number; week: number };
  appeals: { total: number; raised: number };
  supremes: { total: number; raised: number };
  countersuits: { total: number; played: number; skipped: number; averageHits: number | null; perfect: number };
  responses: { total: number; declined: number };
  ideas: { pending: number; approved: number; private: number };
  jury: { votes: number; cases: number };
  confirmations?: { kept: number; alternative: number; general: number; none: number };
}

export const ideasApi = {
  stats: (token: string) => request<UsageStats>("/api/admin/stats", { headers: { "X-Admin-Token": token } }),
  /** 공개 요청은 운영자 승인 전까지 보이지 않는다. 거절되면 ApiError(422)나 429가 난다. */
  submit: (text: string, isPublic: boolean, nickname: string) =>
    request<{ status: "pending" | "private" }>("/api/ideas", {
      method: "POST",
      body: JSON.stringify({ text, public: isPublic, ...(nickname.trim() ? { nickname: nickname.trim() } : {}) }),
    }),
  adminList: (token: string) =>
    request<{ ideas: AdminIdea[] }>("/api/ideas/admin", { headers: { "X-Admin-Token": token } }),
  review: (token: string, id: number, status: "approved" | "rejected") =>
    request<{ id: number; status: string }>(`/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "X-Admin-Token": token },
      body: JSON.stringify({ status }),
    }),
};

/**
 * 랜딩 전광판 데이터. request()와 달리 재시도·연결 배너를 발동하지 않는다 —
 * 콜드스타트 중이면 전광판 없이 랜딩을 보여주는 게 낫다.
 */
export async function fetchBoard(): Promise<BoardData | null> {
  for (const base of [PROXY_BASE, DIRECT_BASE]) {
    try {
      const res = await fetch(`${base}/api/board`);
      if (res.ok) return (await res.json()) as BoardData;
    } catch {
      /* 다음 경로 시도 */
    }
  }
  return null;
}
