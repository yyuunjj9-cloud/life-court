/**
 * 사건 재현 공유 링크.
 * 사건 입력 + 사건번호를 base64url로 URL에 담는다 — 서버 조회가 없어
 * 링크를 받은 사람만 볼 수 있고, 판결은 시드 기반이라 원본과 동일하게 재현된다.
 */

import type { CaseInput, CaseType, Relationship, Severity, Tone } from "@/domain/judgment";

/** OG 카드·미리보기용 표시 필드 — 판결 재생성 없이 링크만으로 그릴 수 있게 페이로드에 동봉한다. */
export interface SharedDisplay {
  caseName: string;
  crime: string;
  result: string;
}

export interface SharedCase {
  input: CaseInput;
  seq: number;
  /** 구버전 링크에는 없을 수 있다. */
  display?: SharedDisplay;
}

const CASE_TYPES: readonly CaseType[] = ["work", "relationship", "meal", "messenger", "daily"];
const RELATIONSHIPS: readonly Relationship[] = ["self", "colleague", "friend", "boss", "anonymous"];
const TONES: readonly Tone[] = ["lenient", "fair", "strict"];

/** backend hashSeed와 동일한 FNV-1a — 공유 토큰 공식을 양쪽에서 맞춘다. */
function fnv1a(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 짧은 공유 ID: "사건번호-토큰". 토큰은 사연을 아는 당사자만 계산할 수 있어
 * 순번 열거로 타인의 사건을 열 수 없다. 카톡에 붙여도 스팸처럼 보이지 않는 길이.
 */
export function shortShareId(seq: number, story: string): string {
  return `${seq}-${fnv1a(`share|${seq}|${story}`).toString(36)}`;
}

export function parseShortShareId(id: string): { seq: number; token: string } | null {
  const m = /^(\d{1,7})-([0-9a-z]{1,8})$/.exec(id);
  if (!m) return null;
  const seq = Number(m[1]);
  if (!Number.isInteger(seq) || seq < 1) return null;
  return { seq, token: m[2] };
}

export function encodeSharedCase(input: CaseInput, seq: number, display?: SharedDisplay): string {
  const payload = {
    s: input.story,
    t: input.caseType,
    r: input.relationship,
    v: input.severity,
    o: input.tone,
    n: seq,
    ...(display ? { cn: display.caseName, cr: display.crime, rs: display.result } : {}),
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

    const display =
      typeof p.cn === "string" && typeof p.cr === "string" && typeof p.rs === "string"
        ? { caseName: p.cn.slice(0, 30), crime: p.cr.slice(0, 30), result: p.rs.slice(0, 20) }
        : undefined;

    return {
      input: {
        story,
        caseType: p.t as CaseType,
        relationship: p.r as Relationship,
        severity: Number(p.v) as Severity,
        tone: p.o as Tone,
      },
      seq,
      display,
    };
  } catch {
    return null;
  }
}
