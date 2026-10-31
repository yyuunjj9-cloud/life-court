/**
 * 고소장·고발장·내용증명·맞고소장 — 템플릿/규칙 기반 문서 생성기.
 * 판결 생성기와 마찬가지로 사연을 시드로 사용해 같은 입력이면 같은 문서가 나온다.
 */

import {
  DEFENDANTS,
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
}

function excerptOf(story: string): string {
  return story.length > 40 ? `${story.slice(0, 40)}…` : story;
}

/* ---------- 고소장 / 고발장 ---------- */

const COMPLAINANTS: Record<FilingKind, readonly string[]> = {
  complaint: ["원고 본인 (직접 피해자)", "억울함을 참지 못한 원고 본인"],
  accusation: ["정의로운 목격자 (본인)", "그냥 지나칠 수 없었던 제3자 (본인)"],
};

const EVIDENCE_POOL = [
  "정신적 충격 진술서 1부 (본인 작성)",
  "당시 상황 스크린샷 1매 (마음속 보관)",
  "깊은 한숨 녹취록 1건",
  "목격자 진술서 (목격자: 본인) 1부",
  "억울함 일지 1권",
  "그날의 표정 재연 사진 1매",
] as const;

const COMPLAINT_FACT_CLOSERS = [
  "이는 단순한 해프닝으로 넘기기에는 그 괘씸함이 상당하다.",
  "위 행위로 인하여 고소인의 생활 평온이 심각하게 침해되었다.",
  "피고소인은 현재까지 별다른 사과의 정황을 보이지 않고 있다.",
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
    background: `발신인은 최근 "${excerptOf(input.story)}"라는 일을 겪었습니다. 이는 수신인의 부주의 또는 고의에 기인한 것으로, 발신인의 생활 평온을 명백히 해치는 행위입니다.`,
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
] as const;

const COUNTER_FACT_CLOSERS = [
  "이는 생활 분쟁의 평화적 해결 관행을 정면으로 위반한 것이다.",
  "맞고소인은 이로 인해 상당한 정신적 당혹감을 호소하고 있다.",
  "법정은 장난감이 아니라는 점을 피맞고소인에게 상기시킬 필요가 있다.",
] as const;

/** 원심에서 가벼운 처분이 나왔을수록 맞고소가 인용되기 쉽다. */
export function generateCountersuit(input: CaseInput, verdict: Verdict): CountersuitDoc {
  const rand = mulberry32(hashSeed(`counter|${verdict.caseNo}|${input.story}`));
  const wasLenient = verdict.result === "무죄" || verdict.result === "훈방 조치";
  const accepted = rand() < (wasLenient ? 0.7 : 0.15);

  const base = {
    counterComplainant: verdict.defendant,
    counterRespondent: "원고 (당신)",
    crime: pick(rand, COUNTER_CRIMES),
    facts: `피맞고소인은 "${excerptOf(input.story)}" 정도의 일로 맞고소인을 생활법원에 세웠는바, ${pick(
      rand,
      COUNTER_FACT_CLOSERS,
    )}`,
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
