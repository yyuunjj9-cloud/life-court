/**
 * 사건 재현 공유 링크.
 * 사건 입력 + 사건번호를 base64url로 URL에 담는다 — 서버 조회가 없어
 * 링크를 받은 사람만 볼 수 있고, 판결은 시드 기반이라 원본과 동일하게 재현된다.
 */

import type { CaseInput, CaseType, Relationship, Severity, Tone } from "@/domain/judgment";

export interface SharedCase {
  input: CaseInput;
  seq: number;
}

const CASE_TYPES: readonly CaseType[] = ["work", "relationship", "meal", "messenger", "daily"];
const RELATIONSHIPS: readonly Relationship[] = ["self", "colleague", "friend", "boss", "anonymous"];
const TONES: readonly Tone[] = ["lenient", "fair", "strict"];

export function encodeSharedCase(input: CaseInput, seq: number): string {
  const payload = {
    s: input.story,
    t: input.caseType,
    r: input.relationship,
    v: input.severity,
    o: input.tone,
    n: seq,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSharedCase(d: string): SharedCase | null {
  try {
    const b64 = d.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const p = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;

    const story = typeof p.s === "string" ? p.s.trim() : "";
    const seq = Number(p.n);
    if (story.length < 10 || story.length > 300) return null;
    if (!CASE_TYPES.includes(p.t as CaseType)) return null;
    if (!RELATIONSHIPS.includes(p.r as Relationship)) return null;
    if (!TONES.includes(p.o as Tone)) return null;
    if (![1, 2, 3, 4, 5].includes(Number(p.v))) return null;
    if (!Number.isInteger(seq) || seq < 1) return null;

    return {
      input: {
        story,
        caseType: p.t as CaseType,
        relationship: p.r as Relationship,
        severity: Number(p.v) as Severity,
        tone: p.o as Tone,
      },
      seq,
    };
  } catch {
    return null;
  }
}
