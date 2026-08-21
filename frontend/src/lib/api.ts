/**
 * backend API 클라이언트.
 * 기본 주소는 로컬 백엔드(4000). 배포 시 NEXT_PUBLIC_API_URL로 지정한다.
 *
 * - Render 무료 티어 콜드스타트(30~60초)와 간헐 라우팅 404를 백오프 재시도로 흡수한다.
 * - 직접 연결이 네트워크 수준에서 계속 실패하면(통신사 차단·DNS 문제 등)
 *   같은 도메인의 Vercel 프록시 경로(/backend/*)로 자동 전환한다.
 * - 재시도 진행 상황을 구독할 수 있어 UI가 진행 바를 그릴 수 있다.
 */

import type { AppealVerdict, CaseInput, Verdict } from "@/domain/judgment";
import type { ComplaintDoc, CountersuitDoc, DemandLetterDoc, FilingKind } from "@/domain/documents";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
/** next.config.mjs rewrites가 /backend/* 를 백엔드로 프록시한다. */
const PROXY_BASE = "/backend";

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

let networkFailures = 0;
let useProxy = false;

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
    const base = useProxy && typeof window !== "undefined" ? PROXY_BASE : BASE;
    try {
      const res = await fetch(`${base}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...init?.headers },
      });
      if (res.ok) {
        networkFailures = 0;
        setConn({ phase: "idle", startedAt: 0, attempt: 0 });
        return (await res.json()) as T;
      }
      if (!RETRYABLE_STATUS.has(res.status)) {
        setConn({ phase: "idle", startedAt: 0, attempt: 0 });
        throw new Error(`API ${path} failed: ${res.status}`);
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith(`API ${path}`)) throw e;
      lastError = e;
      // fetch 자체가 던지는 오류는 네트워크 수준 실패 — 2회 누적 시 프록시로 전환
      networkFailures++;
      if (networkFailures >= 2) useProxy = true;
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
  submitCase: (input: CaseInput, filingKind: FilingKind) =>
    request<{ seq: number; verdict: Verdict; complaint: ComplaintDoc }>("/api/cases", {
      method: "POST",
      body: JSON.stringify({ ...input, filingKind }),
    }),

  fileAppeal: (seq: number) =>
    request<{ appeal: AppealVerdict }>(`/api/cases/${seq}/appeal`, { method: "POST" }),

  fileCountersuit: (seq: number) =>
    request<{ countersuit: CountersuitDoc }>(`/api/cases/${seq}/countersuit`, { method: "POST" }),

  createDemandLetter: (input: CaseInput) =>
    request<{ demand: DemandLetterDoc }>("/api/documents/demand", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  nextSeq: () => request<{ seq: number }>("/api/meta/next-seq"),

  health: () => request<{ ok: boolean; db_ok: boolean }>("/api/health"),
};
