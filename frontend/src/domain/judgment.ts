/**
 * 프론트엔드 공용 타입·라벨 정의.
 * 판결·문서 생성 로직은 backend(src/domain)에서 수행되고,
 * 프론트는 API가 돌려준 문서를 표시만 한다.
 */

export type CaseType = "work" | "relationship" | "meal" | "messenger" | "daily";
export type Relationship = "self" | "colleague" | "friend" | "boss" | "anonymous";
export type Tone = "lenient" | "fair" | "strict";
export type Severity = 1 | 2 | 3 | 4 | 5;

export interface CaseInput {
  story: string;
  caseType: CaseType;
  relationship: Relationship;
  severity: Severity;
  tone: Tone;
}

export interface Verdict {
  caseNo: string;
  caseName: string;
  defendant: string;
  crime: string;
  order: string;
  reasoning: string;
  advice: string;
  result: string;
  resultNote: string;
}

export interface AppealVerdict {
  order: string;
  orderNote: string;
  reasoning: string;
  overturned: boolean;
}

export const CASE_TYPE_LABEL: Record<CaseType, string> = {
  work: "회사생활",
  relationship: "인간관계",
  meal: "식사",
  messenger: "메신저",
  daily: "일상",
};

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  self: "본인",
  colleague: "동료",
  friend: "친구",
  boss: "상사",
  anonymous: "익명 인물",
};

export const TONE_LABEL: Record<Tone, string> = {
  lenient: "관대함",
  fair: "공정함",
  strict: "엄벌주의",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  1: "사소함",
  2: "약간 괘씸함",
  3: "정식 심리 필요",
  4: "중대 사건",
  5: "국가적 위기",
};

export function formatCaseNo(seq: number, year = 2026): string {
  return `${year} 생활 제${String(seq).padStart(3, "0")}호`;
}

export const TRIAL_STEPS = [
  "사건 기록을 검토하는 중...",
  "증거 능력을 과도하게 판단하는 중...",
  "유사 생활사건을 검토하는 중...",
  "사회 통념을 지나치게 반영하는 중...",
  "재판부가 진지하게 고민하는 중...",
  "판결문 작성 중...",
] as const;
