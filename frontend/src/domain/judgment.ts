/**
 * 프론트엔드 공용 타입·라벨 정의.
 * 판결·문서 생성 로직은 backend(src/domain)에서 수행되고,
 * 프론트는 API가 돌려준 문서를 표시만 한다.
 */

export type CaseType = "work" | "relationship" | "meal" | "messenger" | "money" | "romance" | "daily";
export type Relationship = "self" | "colleague" | "friend" | "family" | "lover" | "neighbor" | "boss" | "anonymous";
export type Tone = "lenient" | "fair" | "strict";
export type Severity = 1 | 2 | 3 | 4 | 5;

export interface CaseInput {
  story: string;
  caseType: CaseType;
  relationship: Relationship;
  severity: Severity;
  tone: Tone;
  /** '사건 특정' 화면에서 고른 사건명. GENERAL_CHOICE면 일반 분쟁. 없으면 재판부가 고른 사건. */
  scenario?: string;
}

/** '사건 특정' 화면의 '해당 없음' 값(backend와 같다). */
export const GENERAL_CHOICE = "general";

export interface Verdict {
  caseNo: string;
  caseName: string;
  defendant: string;
  crime: string;
  order: string;
  reasoning: string;
  advice: string;
  /** 구버전 저장 데이터에는 없을 수 있다. */
  evidence?: string[];
  result: string;
  resultNote: string;
}

export interface AppealVerdict {
  order: string;
  orderNote: string;
  reasoning: string;
  overturned: boolean;
}

/** 대법원 상고심 — 원고가 원할 때만 한 번 연다. 결과는 확정이다. */
export interface SupremeVerdict extends AppealVerdict {
  /** 확정된 처분 */
  finalResult: string;
}

/** 구체적 행위를 특정하지 못한 사연에 붙는 죄목 — 서버의 GENERAL_CRIME과 같아야 한다(테스트로 확인). */
export const GENERAL_CRIME = "생활 배려 의무 소홀 혐의";

/** 처분 사다리 — 가벼운 처분부터. */
const LADDER = ["무죄", "훈방 조치", "조건부 유죄", "유죄", "괘씸죄 가중 유죄"];

/**
 * 원고의 항소·상고로 처분이 더 무거워질 수 없는 이유 — 서버 규칙(raiseCeiling)과 같다.
 * max: 이미 가장 무거운 처분, general: 근거가 부족한 일반 분쟁이라 훈방 조치가 상한.
 */
export function raiseBlock(result: string, crime: string): "max" | "general" | null {
  if (result === LADDER[LADDER.length - 1]) return "max";
  if (crime === GENERAL_CRIME && LADDER.indexOf(result) >= LADDER.indexOf("훈방 조치")) return "general";
  return null;
}

/** 항소심이 확정한 처분 — 예전 규칙의 항소(원심 파기 후 무죄)도 주문에 적힌 대로 읽는다. */
export function appealResult(verdict: Verdict, appeal: AppealVerdict): string {
  const raised = appeal.order.match(/^원심 파기\. (.+?)\.$/)?.[1];
  return appeal.overturned && raised && LADDER.includes(raised) ? raised : verdict.result;
}

/** 더 올릴 수 없을 때 이용자에게 보여 줄 안내. */
export const RAISE_BLOCK_NOTE: Record<"max" | "general", string> = {
  max: "이미 가장 무거운 처분이라 더 올릴 수 없어요. 원고의 억울함은 이미 충분히 인정됐어요.",
  general: "사연에서 상대의 구체적인 행동을 찾지 못해 훈방 조치보다 무겁게 올릴 수 없어요. 언제, 무엇을 했는지 구체적으로 적어 새로 접수해 보세요.",
};

export const CASE_TYPE_LABEL: Record<CaseType, string> = {
  work: "회사생활",
  relationship: "인간관계",
  meal: "식사",
  messenger: "메신저",
  money: "돈·정산",
  romance: "연애·썸",
  daily: "일상",
};

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  self: "본인",
  colleague: "동료",
  friend: "친구",
  family: "가족",
  lover: "연인·썸",
  neighbor: "이웃",
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

/** 접수 연도 — 서버와 같이 한국 시간 기준으로 정한다. */
export function caseYear(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric" }).format(now));
}

export function formatCaseNo(seq: number, year = caseYear()): string {
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
