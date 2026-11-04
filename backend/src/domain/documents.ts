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
  SCENARIOS,
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
  /** 반박 카드 게임 기록. 건너뛰었으면 없다. highlight는 처음 맞힌 반박 문장이다. */
  objections?: { hits: number; total: number; highlight?: string };
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

/** 맞고소가 인용되면 원고가 받는 벌칙 — 가볍고 무해한 화해형 벌칙만 쓴다. */
const COUNTER_PENALTIES = [
  "피맞고소인(원고)은 맞고소인에게 음료 1잔을 제공하고 정중히 화해할 것을 명한다.",
  "피맞고소인(원고)은 맞고소인이 고른 노래 한 곡을 끝까지 함께 들을 것을 명한다.",
  "피맞고소인(원고)은 다음 약속 장소 선택권을 맞고소인에게 넘길 것을 명한다.",
  "피맞고소인(원고)은 맞고소인의 다음 이야기에 '그럴 수 있지'로 세 번 답할 것을 명한다.",
  "피맞고소인(원고)은 이번 사건을 일주일간 단체방에 꺼내지 않을 것을 명한다.",
  "피맞고소인(원고)은 맞고소인의 장점 두 가지를 직접 말해 줄 것을 명한다.",
  "피맞고소인(원고)은 다음 단체 사진에서 맞고소인을 가장 잘 나온 각도로 찍어 줄 것을 명한다.",
  "피맞고소인(원고)은 오늘 하루 맞고소인의 농담에 웃어 줄 것을 명한다.",
  "피맞고소인(원고)은 판결문 공유를 하루 미루고, 그 사이 먼저 화해를 청할 것을 명한다.",
  "피맞고소인(원고)은 맞고소인에게 '나도 좀 예민했다'는 메시지를 1회 보낼 것을 명한다.",
  "피맞고소인(원고)은 다음 만남에서 맞고소인의 근황을 먼저 물을 것을 명한다.",
  "피맞고소인(원고)은 맞고소인이 추천하는 영상 하나를 끝까지 보고 감상을 전할 것을 명한다.",
] as const;

/** 맞고소 죄목마다 원고가 낼 수 있는 맞는 반박 — 반박 카드 게임의 정답 카드. */
const COUNTER_CRIME_REBUTTALS: Record<(typeof COUNTER_CRIMES)[number], string> = {
  "과잉 고소죄": "사소한 일을 사소할 때 바로잡으려 한 것이므로 과잉이 아니라 예방이다.",
  "사소한 일 법정 소환죄": "생활법원은 바로 그 사소한 일을 다루려고 문을 연 곳이다.",
  "지나친 정의감 발동죄": "정의감이 지나치다고 하려면 먼저 상대의 행동이 지나치지 않았어야 한다.",
  "판결문 단체방 유포 모의죄": "판결문은 아직 원고의 휴대폰 안에 있으며, 모의만으로는 처벌할 수 없다.",
  "괘씸죄의 괘씸죄": "괘씸함을 느낀 데에는 원인이 있었고, 그 원인을 만든 쪽은 따로 있다.",
  "원고 코스프레죄": "원고석에 앉은 사실은 사건번호가 증명하며, 의상은 평소 차림이었다.",
  "선택적 기억 편집죄": "사연은 일어난 순서대로 적었으며, 빠진 장면이 있다면 피고 측이 제출하면 된다.",
  "본인 지분 은폐죄": "원고의 지분이 있었다면 피고 측이 그 자리에서 바로 말했을 것이다.",
  "사건 과장 각색죄": "과장할 생각이었다면 심각성을 5로 골랐을 것이다.",
  "재판 중독죄": "이번이 처음 접수한 사건이며, 중독을 입증할 기록이 제출되지 않았다.",
  "합의 거부 상습죄": "합의 제안이 먼저 온 적이 없으므로 거부할 기회도 없었다.",
  "판결문 프사 등록 모의죄": "프로필 사진은 여전히 그대로이며, 모의의 증거가 없다.",
};

/** 맞고소 사유마다 맞는 반박. */
const COUNTER_CLOSER_REBUTTALS: Record<(typeof COUNTER_FACT_CLOSERS)[number], string> = {
  "이는 생활 분쟁의 원만한 해결 관행에 정면으로 반하는 것이다.": "원만한 해결을 먼저 깬 행동이 있었기에 법원을 찾은 것이다.",
  "맞고소인은 이로 인해 상당한 정신적 당혹감을 호소하고 있다.": "당혹감은 사연 속에서 원고가 먼저 겪었다.",
  "법정은 장난감이 아니라는 점을 피맞고소인에게 상기시킬 필요가 있다.": "그래서 장난이 아니라 진지하게 사건번호를 받아 왔다.",
  "피맞고소인 역시 유사 행위를 한 전력이 있다는 자료가 맞고소장에 첨부되었다.": "첨부된 자료에는 날짜도 출처도 없어 증거로 볼 수 없다.",
  "맞고소인은 '먼저 법대로 하자고 한 것은 저쪽'이라는 진술을 유지하고 있다.": "누가 먼저 말했든, 먼저 불편을 준 행동은 사연에 적혀 있다.",
  "양측의 진술을 종합하면 쌍방 모두 성인군자는 아닌 것으로 보인다.": "성인군자가 아니어도 억울할 수는 있다.",
};

/** 반박 카드 게임의 라운드 수. */
export const COUNTER_ROUNDS = 3;

/** 반박 카드 한 라운드 — answer는 options 안의 맞는 반박 위치다. */
export interface CounterRound {
  claim: string;
  options: string[];
  answer: number;
}

/**
 * 건너뛰었을 때의 맞고소 인용 확률 — [원심 무죄·훈방, 그 외]. 게임 이전과 같다.
 * 게임을 하면 확률이 아니라 맞힌 반박 수로 정한다(counterNeeded).
 */
export const SKIP_ACCEPT_CHANCE = [0.7, 0.15] as const;

function wasLenient(verdict: Verdict): boolean {
  return verdict.result === "무죄" || verdict.result === "훈방 조치";
}

/** 맞고소를 기각시키려면 맞혀야 하는 반박 수 — 원심이 가벼웠으면 피고 기세가 등등해 모두 맞혀야 한다. */
export function counterNeeded(verdict: Verdict): number {
  return wasLenient(verdict) ? COUNTER_ROUNDS : COUNTER_ROUNDS - 1;
}

/** 인용 판단 → 죄목 → 사유 순서를 바꾸면 같은 사건의 맞고소 결과가 예전과 달라진다. */
function drawCountersuit(input: CaseInput, verdict: Verdict) {
  const rand = mulberry32(hashSeed(`counter|${verdict.caseNo}|${input.story}`));
  const roll = rand();
  const crime = pick(rand, COUNTER_CRIMES);
  const closer = pick(rand, COUNTER_FACT_CLOSERS);
  return { rand, roll, crime, closer };
}

/**
 * 반박 카드 3라운드 — 맞고소장과 같은 궤변(사건 항변·맞고소 죄목·사유)에 맞는 반박 1장과 엇나간 반박 2장.
 * 엇나간 카드는 다른 사건의 판시라 들어맞지 않는 것이 웃음 포인트다. 같은 사건은 같은 카드를 받는다.
 */
export function generateCounterRounds(input: CaseInput, verdict: Verdict): CounterRound[] {
  const { crime, closer } = drawCountersuit(input, verdict);
  const scenario = selectScenario(input.story, input.caseType);
  const rand = mulberry32(hashSeed(`rebuttal|${verdict.caseNo}|${input.story}`));
  const otherRulings = Object.values(SCENARIOS).flat().map((s) => s.defense.rejection).filter((r) => r !== scenario.defense.rejection);
  const counterRebuttals = [...Object.values(COUNTER_CRIME_REBUTTALS), ...Object.values(COUNTER_CLOSER_REBUTTALS)];
  const round = (claim: string, correct: string, decoyPool: readonly string[]): CounterRound => {
    const decoys: string[] = [];
    while (decoys.length < 2) {
      const d = pick(rand, decoyPool);
      if (d !== correct && !decoys.includes(d)) decoys.push(d);
    }
    const options = [correct, ...decoys];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { claim, options, answer: options.indexOf(correct) };
  };
  return [
    round(scenario.defense.claim, scenario.defense.rejection, otherRulings),
    // 맞고소 죄목은 모두 '죄'로 끝나 받침이 없다.
    round(`피맞고소인은 ${crime}를 범했습니다`, COUNTER_CRIME_REBUTTALS[crime], [...counterRebuttals, ...otherRulings]),
    round(closer, COUNTER_CLOSER_REBUTTALS[closer], [...counterRebuttals, ...otherRulings]),
  ];
}

/** 예전 화면과의 호환용 — 궤변 문장만. */
export function generateCountersuitBrief(input: CaseInput, verdict: Verdict): string[] {
  return generateCounterRounds(input, verdict).map((r) => r.claim);
}

/** 고른 카드로 맞힌 수와 결정적 반박(처음 맞힌 반박)을 계산한다 — 서버가 다시 계산해 조작을 막는다. */
export function scorePicks(input: CaseInput, verdict: Verdict, picks: number[]): { hits: number; highlight: string | null } {
  const rounds = generateCounterRounds(input, verdict);
  const correct = rounds.filter((r, i) => picks[i] === r.answer);
  return { hits: correct.length, highlight: correct[0]?.options[correct[0].answer] ?? null };
}

/**
 * 게임을 했으면 맞힌 반박 수가 counterNeeded 이상일 때 기각, 아니면 인용이다.
 * hits가 없으면(건너뛰기) 게임 이전과 같은 확률로 정하고 변론 기록은 남기지 않는다.
 */
export function generateCountersuit(input: CaseInput, verdict: Verdict, hits?: number, highlight?: string | null): CountersuitDoc {
  const { rand, roll, crime, closer } = drawCountersuit(input, verdict);
  const accepted = hits === undefined
    ? roll < SKIP_ACCEPT_CHANCE[wasLenient(verdict) ? 0 : 1]
    : hits < counterNeeded(verdict);

  const base = {
    counterComplainant: verdict.defendant,
    counterRespondent: "원고 (당신)",
    crime,
    facts: `피맞고소인은 "${excerptOf(input.story)}" 정도의 일로 맞고소인을 생활법원에 세웠는바, ${closer}`,
    ...(hits === undefined ? {} : { objections: { hits, total: COUNTER_ROUNDS, ...(highlight ? { highlight } : {}) } }),
  };

  if (accepted) {
    return {
      ...base,
      accepted: true,
      rulingLabel: "맞고소 인용",
      // 앞의 난수 순서를 바꾸지 않도록 인용일 때만 벌칙을 뽑는다.
      rulingNote: pick(rand, COUNTER_PENALTIES),
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
