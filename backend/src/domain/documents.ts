/**
 * 고소장·고발장·내용증명·맞고소장 — 템플릿/규칙 기반 문서 생성기.
 * 판결 생성기와 마찬가지로 사연을 시드로 사용해 같은 입력이면 같은 문서가 나온다.
 */

import {
  DEFENDANTS,
  EVIDENCE_POOL,
  excerptOf,
  hashSeed,
  mulberry32,
  pick,
  pickScenarioOrder,
  selectScenario,
  type CaseInput,
  type Verdict,
} from "./judgment";

/** 접수 방식: 고소(피해자 본인) / 고발(제3자) */
export type FilingKind = "complaint" | "accusation";

export const FILING_LABEL: Record<FilingKind, string> = {
  complaint: "고소장",
  accusation: "고발장",
};

export interface ComplaintDoc {
  kind: FilingKind;
  title: string;
  caseNo: string;
  complainant: string;
  respondent: string;
  crime: string;
  purpose: string;
  facts: string;
  evidence: string[];
}

export interface DemandLetterDoc {
  title: string;
  sender: string;
  receiver: string;
  background: string;
  rebuttal: string;
  demand: string;
  deadline: string;
  warning: string;
}

export interface CountersuitDoc {
  counterComplainant: string;
  counterRespondent: string;
  crime: string;
  facts: string;
  accepted: boolean;
  rulingLabel: string;
  rulingNote: string;
  /** 혼자 변론 게임 기록. 건너뛰었으면 없다. */
  objections?: { hits: number; total: number };
}

/* ---------- 고소장 / 고발장 ---------- */

const COMPLAINANTS: Record<FilingKind, readonly string[]> = {
  complaint: ["원고 본인 (직접 피해자)", "억울함을 참지 못한 원고 본인"],
  accusation: ["정의로운 목격자 (본인)", "그냥 지나칠 수 없었던 제3자 (본인)"],
};

const COMPLAINT_FACT_CLOSERS = [
  "이는 단순한 해프닝으로 넘기기에는 그 괘씸함이 상당하다.",
  "위 행위로 인하여 고소인의 일상생활의 평온이 현저히 침해되었다.",
  "피고소인은 현재까지 아무런 사과나 원상회복의 조치를 취하지 아니하고 있다.",
] as const;

export function generateComplaint(input: CaseInput, verdict: Verdict, kind: FilingKind): ComplaintDoc {
  const rand = mulberry32(hashSeed(`filing|${kind}|${verdict.caseNo}|${input.story}`));
  const subject = kind === "complaint" ? "고소인" : "고발인";
  const evidence = [...EVIDENCE_POOL].sort(() => rand() - 0.5).slice(0, 3);

  return {
    kind,
    title: FILING_LABEL[kind],
    caseNo: verdict.caseNo,
    complainant: pick(rand, COMPLAINANTS[kind]),
    respondent: verdict.defendant,
    crime: verdict.crime,
    purpose: `${subject}은 피${subject.slice(0, 2)}인을 「${verdict.crime}」(으)로 ${
      kind === "complaint" ? "고소" : "고발"
    }하오니, 엄숙하고 편파적으로 심리하여 주시기 바랍니다.`,
    facts: `피${subject.slice(0, 2)}인은 "${excerptOf(input.story)}"라는 행위에 이르렀다. ${pick(
      rand,
      COMPLAINT_FACT_CLOSERS,
    )}`,
    evidence,
  };
}

/* ---------- 내용증명 ---------- */

const DEMAND_WARNINGS = [
  "위 기한 내 이행하지 아니할 경우, 발신인은 부득이 오늘의 생활법원에 정식으로 사건을 접수할 예정임을 엄중히 통지합니다.",
  "기한 도과 시 본 건은 생활법원 정식 심리로 전환되며, 그때 가서 후회해도 소용없음을 미리 알려드립니다.",
] as const;

export function generateDemandLetter(input: CaseInput): DemandLetterDoc {
  const rand = mulberry32(hashSeed(`demand|${input.story}|${input.caseType}|${input.relationship}`));
  // 판결 생성기와 같은 선택 함수를 쓰므로, 재판 전환 시 판결문의 사건명·죄명·주문과 일치한다.
  const scenario = selectScenario(input.story, input.caseType);

  return {
    title: `「${scenario.name}」 관련 시정 요구의 건`,
    sender: "원고 본인",
    receiver: pick(rand, DEFENDANTS[input.relationship]),
    background: `발신인은 최근 "${excerptOf(input.story)}"라는 일을 겪었습니다. 이는 수신인의 부주의 또는 고의에 기인한 것으로, 발신인의 일상생활의 평온을 현저히 해치는 행위입니다.`,
    // 판결문에서 배척될 항변을 내용증명 단계에서 미리 봉쇄한다.
    rebuttal: `수신인께서는 "${scenario.defense.claim}"라고 해명하실 것으로 예상됩니다. 그러나 생활법원은 동종 사건에서 같은 취지의 항변에 대하여 "${scenario.defense.rejection}"라고 판시한 바 있으므로, 해당 해명은 통하지 않을 것임을 미리 알려드립니다.`,
    demand: pickScenarioOrder(input.story, scenario).replace(/^피고인([은의])/, "수신인$1"),
    deadline: "본 서면 수령일로부터 3일 이내",
    warning: pick(rand, DEMAND_WARNINGS),
  };
}

/* ---------- 맞고소장 ---------- */

const COUNTER_CRIMES = [
  "과잉 고소죄",
  "사소한 일 법정 소환죄",
  "지나친 정의감 발동죄",
  "판결문 단체방 유포 모의죄",
  "괘씸죄의 괘씸죄",
  "원고 코스프레죄",
  "선택적 기억 편집죄",
  "본인 지분 은폐죄",
  "사건 과장 각색죄",
  "재판 중독죄",
  "합의 거부 상습죄",
  "판결문 프사 등록 모의죄",
] as const;

const COUNTER_FACT_CLOSERS = [
  "이는 생활 분쟁의 원만한 해결 관행에 정면으로 반하는 것이다.",
  "맞고소인은 이로 인해 상당한 정신적 당혹감을 호소하고 있다.",
  "법정은 장난감이 아니라는 점을 피맞고소인에게 상기시킬 필요가 있다.",
  "피맞고소인 역시 유사 행위를 한 전력이 있다는 자료가 맞고소장에 첨부되었다.",
  "맞고소인은 '먼저 법대로 하자고 한 것은 저쪽'이라는 진술을 유지하고 있다.",
  "양측의 진술을 종합하면 쌍방 모두 성인군자는 아닌 것으로 보인다.",
] as const;

/** 혼자 변론 게임의 라운드 수 — 원고가 막아야 할 궤변의 개수. */
export const COUNTER_ROUNDS = 3;

/**
 * 이의 제기 성공 횟수(0~3)별 맞고소 인용 확률 — [원심 무죄·훈방, 그 외].
 * 건너뛰면 1회로 치므로 1회 행이 게임 이전의 확률과 같아야 한다.
 * 3회 모두 막으면 '완벽 변론'으로 반드시 기각한다 — 다 막고도 지면 납득하기 어렵다.
 */
export const COUNTER_ACCEPT_CHANCE = [
  [0.8, 0.25],
  [0.7, 0.15],
  [0.55, 0.08],
  [0, 0],
] as const;

/** 인용 판단 → 죄목 → 사유 순서를 바꾸면 같은 사건의 맞고소 결과가 예전과 달라진다. */
function drawCountersuit(input: CaseInput, verdict: Verdict) {
  const rand = mulberry32(hashSeed(`counter|${verdict.caseNo}|${input.story}`));
  const roll = rand();
  const crime = pick(rand, COUNTER_CRIMES);
  const closer = pick(rand, COUNTER_FACT_CLOSERS);
  return { rand, roll, crime, closer };
}

/** 혼자 변론 게임에서 원고가 막을 궤변 — 맞고소장과 같은 죄목·사유를 쓴다. */
export function generateCountersuitBrief(input: CaseInput, verdict: Verdict): string[] {
  const { crime, closer } = drawCountersuit(input, verdict);
  return [
    selectScenario(input.story, input.caseType).defense.claim,
    // 맞고소 죄목은 모두 '죄'로 끝나 받침이 없다.
    `피맞고소인은 ${crime}를 범했습니다`,
    closer,
  ];
}

/**
 * 원심에서 가벼운 처분이 나왔을수록, 원고가 이의를 적게 막았을수록 맞고소가 인용되기 쉽다.
 * hits가 없으면(건너뛰기·구형 화면) 1회로 보고 변론 기록은 남기지 않는다.
 */
export function generateCountersuit(input: CaseInput, verdict: Verdict, hits?: number): CountersuitDoc {
  const { rand, roll, crime, closer } = drawCountersuit(input, verdict);
  const wasLenient = verdict.result === "무죄" || verdict.result === "훈방 조치";
  const accepted = roll < COUNTER_ACCEPT_CHANCE[hits ?? 1][wasLenient ? 0 : 1];

  const base = {
    counterComplainant: verdict.defendant,
    counterRespondent: "원고 (당신)",
    crime,
    facts: `피맞고소인은 "${excerptOf(input.story)}" 정도의 일로 맞고소인을 생활법원에 세웠는바, ${closer}`,
    ...(hits === undefined ? {} : { objections: { hits, total: COUNTER_ROUNDS } }),
  };

  if (accepted) {
    return {
      ...base,
      accepted: true,
      rulingLabel: "맞고소 인용",
      rulingNote: "피맞고소인(원고)은 맞고소인에게 음료 1잔을 제공하고 정중히 화해할 것을 명한다.",
    };
  }
  return {
    ...base,
    accepted: false,
    rulingLabel: rand() < 0.5 ? "맞고소 기각" : "맞고소 각하",
    rulingNote: pick(rand, [
      "패소 직후의 맞고소는 반성 회피의 정황으로 본다.",
      "다만, 쌍방 모두 장난이 지나치면 다친다는 점을 지적해 둔다.",
    ] as const),
  };
}
