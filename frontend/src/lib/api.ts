/**
 * backend API 클라이언트.
 * 기본 주소는 로컬 백엔드(4000). 배포 시 NEXT_PUBLIC_API_URL로 지정한다.
 */

import type { AppealVerdict, CaseInput, Verdict } from "@/domain/judgment";
import type { ComplaintDoc, CountersuitDoc, DemandLetterDoc, FilingKind } from "@/domain/documents";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
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
