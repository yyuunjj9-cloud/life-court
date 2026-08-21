/**
 * backend API 클라이언트.
 * 기본 주소는 로컬 백엔드(4000). 배포 시 NEXT_PUBLIC_API_URL로 지정한다.
 *
 * Render 무료 티어는 15분 유휴 후 잠들어 첫 요청이 30~60초 걸릴 수 있고,
 * 깨어나는 동안 404(x-render-routing: no-server)·5xx가 섞여 나온다.
 * 그래서 모든 요청은 백오프 재시도로 콜드스타트를 흡수한다.
 */

import type { AppealVerdict, CaseInput, Verdict } from "@/domain/judgment";
import type { ComplaintDoc, CountersuitDoc, DemandLetterDoc, FilingKind } from "@/domain/documents";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** 서버 도달 전 실패(라우팅 404) 또는 게이트웨이 오류만 재시도한다. */
const RETRYABLE_STATUS = new Set([404, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 4000, 6000, 8000, 10000, 10000];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...init?.headers },
      });
      if (res.ok) return (await res.json()) as T;
      if (!RETRYABLE_STATUS.has(res.status)) throw new Error(`API ${path} failed: ${res.status}`);
      lastError = new Error(`API ${path} failed: ${res.status}`);
    } catch (e) {
      // 4xx 확정 실패는 그대로 던지고, 네트워크 오류는 재시도한다.
      if (e instanceof Error && e.message.startsWith("API ") && !/40[24]|50[234]/.test(e.message)) throw e;
      lastError = e;
    }
    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }
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
