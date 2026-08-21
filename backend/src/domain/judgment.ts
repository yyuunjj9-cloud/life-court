/**
 * 오늘의 생활법원 — 템플릿/규칙 기반 판결 생성기.
 * 안내 제4조: 모든 판결 결과는 템플릿/규칙 기반으로 생성되며 실제 법령·판례와 무관하다.
 * 같은 입력이면 같은 판결이 나오도록 사연 텍스트를 시드로 사용한다.
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

/* ---------- 시드 난수 ---------- */

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

/* ---------- 템플릿 풀 ---------- */

/**
 * 사건 시나리오: 사건명·가상 죄명·주문이 한 세트로 묶여 있어
 * 판결문 안에서 항상 논리적으로 일관된다.
 */
export interface CaseScenario {
  name: string;
  crime: string;
  orders: readonly string[];
}

export const SCENARIOS: Record<CaseType, readonly CaseScenario[]> = {
  work: [
    {
      name: "회의 직전 자료 요청 사건",
      crime: "회의 직전 자료 요청죄",
      orders: [
        "피고인은 다음 회의부터 자료 요청을 회의 24시간 전까지 완료할 것.",
        "피고인은 향후 자료 검토 요청 시 최소 반나절의 여유를 두고 전달할 것.",
      ],
    },
    {
      name: "업무 떠넘기기 사건",
      crime: "과도한 업무 떠넘기기죄",
      orders: [
        "피고인은 업무 인계 시 범위와 기한을 문서로 명시하고, 금주 내 원고에게 커피 1잔을 제공할 것.",
        "피고인은 떠넘긴 업무의 절반을 회수하여 직접 수행할 것.",
      ],
    },
    {
      name: "퇴근 직전 업무 지시 사건",
      crime: "상습적 야근 유발죄",
      orders: [
        "피고인은 퇴근 30분 전 이후의 신규 업무 지시를 금지당한다.",
        "피고인은 부득이한 늦은 지시 시 다음 날 오전으로 기한을 자동 연장할 것.",
      ],
    },
    {
      name: "공로 가로채기 의혹 사건",
      crime: "공로 무단 점유죄",
      orders: [
        "피고인은 다음 회의에서 실제 기여자의 이름을 명시적으로 언급할 것.",
        "피고인은 가로챈 공로를 원소유자에게 반환하고 전체 메일로 정정할 것.",
      ],
    },
  ],
  relationship: [
    {
      name: "약속 지각 반복 사건",
      crime: "약속 상습 지각죄",
      orders: [
        "피고인은 다음 약속에 10분 먼저 도착하여 성의를 증명할 것.",
        "피고인은 지각 1회당 음료 1잔의 벌칙에 서면 동의할 것.",
      ],
    },
    {
      name: "성의 없는 답장 사건",
      crime: "영혼 없는 리액션죄",
      orders: [
        "피고인은 원고의 다음 이야기 세 건에 진심 어린 리액션을 제공할 것.",
        "피고인은 대화 중 휴대폰을 내려놓고 눈을 맞추는 연습을 이행할 것.",
      ],
    },
    {
      name: "일방적 약속 취소 사건",
      crime: "감정 소모 유발죄",
      orders: [
        "피고인은 약속 취소 시 대체 일정 두 개를 즉시 제시할 것.",
        "피고인은 취소 사유를 성의 있게 설명하고 다음 만남의 비용을 부담할 것.",
      ],
    },
    {
      name: "서운함 누적 사건",
      crime: "배려 결핍죄",
      orders: [
        "피고인은 금주 내 원고에게 안부 연락 1회 이상을 자발적으로 시행할 것.",
        "피고인은 원고가 서운했던 지점 세 가지를 경청하고 복명복창할 것.",
      ],
    },
  ],
  meal: [
    {
      name: "점심 메뉴 결정 지연 사건",
      crime: "과도한 우유부단죄",
      orders: [
        "피고인은 금일 오후 1시까지 제육볶음 또는 비빔밥 중 하나를 최종 선택할 것.",
        "피고인은 메뉴 고민 시간을 3분으로 제한하고 초과 시 첫 번째 후보로 확정할 것.",
      ],
    },
    {
      name: "메뉴 선택권 침해 사건",
      crime: "메뉴 독재죄",
      orders: [
        "피고인은 다음 식사에서 메뉴 결정권을 원고에게 전면 양도할 것.",
        "피고인은 메뉴 결정을 교대제로 전환하는 합의안에 서명할 것.",
      ],
    },
    {
      name: "마지막 한 입 침탈 사건",
      crime: "반찬 무단 점유죄",
      orders: [
        "피고인은 마지막 한 조각에 대한 원고의 우선권을 인정하고 동일 메뉴 1인분을 배상할 것.",
        "피고인은 향후 마지막 조각 취식 전 반드시 구두 동의를 구할 것.",
      ],
    },
    {
      name: "'아무거나' 진술 반복 사건",
      crime: "'아무거나' 상습 진술죄",
      orders: [
        "피고인은 향후 1주일간 '아무거나'라는 진술을 금지당한다.",
        "피고인은 메뉴 질문에 반드시 구체적 후보 두 개 이상으로 답할 것.",
      ],
    },
  ],
  messenger: [
    {
      name: "메시지 읽씹 방치 사건",
      crime: "읽씹 방치죄",
      orders: [
        "피고인은 수신 후 3시간 이내 최소 1개의 성의 있는 문장으로 회신할 것.",
        "피고인은 즉답이 어려운 경우 '이따 답할게' 한 줄이라도 남길 것.",
      ],
    },
    {
      name: "단답 응답 반복 사건",
      crime: "단답 상습죄",
      orders: [
        "피고인은 향후 답장 시 'ㅇㅋ' 단독 사용을 자제하고 완성된 문장으로 회신할 것.",
        "피고인은 답장에 이모티콘 1개 이상을 첨부하여 온기를 보충할 것.",
      ],
    },
    {
      name: "단체방 심야 소환 사건",
      crime: "새벽 단체방 소환죄",
      orders: [
        "피고인은 오후 10시 이후 단체방 소환을 삼갈 것.",
        "피고인은 심야 용건은 예약 전송 기능을 활용하여 오전 9시 이후 도착시킬 것.",
      ],
    },
    {
      name: "이모티콘 성의 논란 사건",
      crime: "복붙 이모티콘 남용죄",
      orders: [
        "피고인은 상황에 맞는 이모티콘을 선별하여 사용할 것.",
        "피고인은 같은 이모티콘 연속 3회 사용 시 문장으로 마음을 표현할 것.",
      ],
    },
  ],
  daily: [
    {
      name: "심야 생활 소음 사건",
      crime: "새벽 소음 유발죄",
      orders: [
        "피고인은 오후 10시 이후 취식·통화·세탁 등 소음 활동을 자제할 것.",
        "피고인은 심야 야식 취식 시 원고에게 한 입을 제공하여 합의를 도모할 것.",
      ],
    },
    {
      name: "공용물품 독점 사건",
      crime: "리모컨 독점죄",
      orders: [
        "피고인은 리모컨 사용권을 요일제로 분할하는 합의안에 서명할 것.",
        "피고인은 채널 변경 전 반드시 시청 중인 자의 동의를 구할 것.",
      ],
    },
    {
      name: "집안일 분담 회피 사건",
      crime: "공용공간 어지럽힘죄",
      orders: [
        "피고인은 금주 내 공용공간을 원상 복구하고 그 결과를 사진으로 보고할 것.",
        "피고인은 집안일 분담표를 작성하여 냉장고에 게시할 것.",
      ],
    },
    {
      name: "알람 연속 미루기 사건",
      crime: "알람 연속 미루기죄",
      orders: [
        "피고인은 알람을 1회로 통일하고 두 번째 미루기부터는 기상할 것.",
        "피고인은 알람 미루기 1회당 아침 설거지 1회를 부담할 것.",
      ],
    },
  ],
};

export const DEFENDANTS: Record<Relationship, readonly string[]> = {
  self: ["자백한 피고인 본인", "스스로 출석한 피고인"],
  colleague: ["익명의 동료", "옆자리의 그 사람"],
  friend: ["오랜 친구", "익명의 절친"],
  boss: ["익명의 상사", "결재란 위의 그분"],
  anonymous: ["성명불상자", "익명의 생활인"],
};

const REASONING_OPENERS = [
  "피고인의 행위는 고의성 여부와 무관하게 원고의 평온한 생활을 침해하였다.",
  "재판부는 제출된 진술을 여러 차례 소리 내어 읽으며 심각하게 고민하였다.",
  "본 사안은 사소해 보이나, 사소함이 반복되면 생활의 근간이 흔들린다.",
  "피고인 측은 별다른 반성의 정황을 제출하지 않았다.",
];

const REASONING_CLOSERS: Record<Tone, readonly string[]> = {
  lenient: [
    "다만 피고인에게도 나름의 사정이 있었을 것으로 보여 이를 참작한다.",
    "누구나 그럴 수 있다는 사회 통념을 재판부는 무겁게 받아들인다.",
  ],
  fair: [
    "이에 재판부는 양측의 입장을 균형 있게 고려하여 아래와 같이 판결한다.",
    "생활의 평화는 쌍방의 노력으로 유지된다는 점을 상기시킨다.",
  ],
  strict: [
    "이러한 행위가 반복될 경우 생활 질서 전반에 악영향을 미칠 것이 명백하다.",
    "재판부는 일벌백계의 정신으로 본 사안을 엄중히 다룬다.",
  ],
};

const ADVICE: Record<CaseType, readonly string[]> = {
  work: [
    "향후 업무 요청 시 기한과 범위를 명시하여 상호 예측 가능성을 높일 것을 권고한다.",
    "바쁠수록 한 줄의 사전 공유가 팀의 평화를 지킨다는 점을 기억할 것을 권고한다.",
  ],
  relationship: [
    "서운함은 쌓아두지 말고 그때그때 가볍게 표현할 것을 권고한다.",
    "관계의 온도는 작은 성의에서 유지된다는 점을 쌍방 모두 유념할 것을 권고한다.",
  ],
  meal: [
    "향후 메뉴 결정이 어려울 경우 가장 먼저 언급된 메뉴를 선택하거나 랜덤 선택 기능을 활용할 것을 권고한다.",
    "식사 자리는 취향 존중의 장임을 상기하고 교대로 결정권을 행사할 것을 권고한다.",
  ],
  messenger: [
    "즉답이 어려운 경우 '이따 답할게' 한 줄이라도 남길 것을 권고한다.",
    "메시지의 온도는 길이가 아니라 성의에서 나온다는 점을 유념할 것을 권고한다.",
  ],
  daily: [
    "생활 규칙은 사전에 합의하고 냉장고에 게시하는 방안을 권고한다.",
    "사소한 배려의 반복이 공동생활의 품격을 만든다는 점을 권고한다.",
  ],
};

/** 심각성 + 성향 → 판결 수위 점수(0~6) */
function verdictScore(severity: Severity, tone: Tone): number {
  const toneOffset = tone === "lenient" ? -1 : tone === "strict" ? 1 : 0;
  return Math.max(0, Math.min(6, severity + toneOffset));
}

const RESULTS: readonly { min: number; result: string; notes: readonly string[] }[] = [
  { min: 5, result: "괘씸죄 가중 유죄", notes: ["형의 감경은 없다. 다만 진심 어린 사과 시 재심을 검토한다.", "재판부는 이례적으로 엄중 경고를 병과한다."] },
  { min: 4, result: "유죄", notes: ["피고인은 판결문 수령 즉시 주문을 이행할 것.", "이행 완료 시 생활기록부의 기재는 말소된다."] },
  { min: 3, result: "조건부 유죄", notes: ["단, 음료 1잔 제공 시 형의 집행을 유예한다.", "단, 진심 어린 사과 1회로 형의 집행을 유예할 수 있다."] },
  { min: 2, result: "훈방 조치", notes: ["다만 동종 사건 재발 시 가중 심리함을 경고한다.", "재판부의 너그러움을 오해하지 말 것을 당부한다."] },
  { min: 0, result: "무죄", notes: ["다만 원고의 서운함에는 충분한 이유가 있음을 부기한다.", "무죄이나, 피고인은 원고에게 따뜻한 말 한마디를 건넬 것을 권고한다."] },
];

export function formatCaseNo(seq: number, year = 2026): string {
  return `${year} 생활 제${String(seq).padStart(3, "0")}호`;
}

export function generateVerdict(input: CaseInput, caseSeq: number): Verdict {
  const rand = mulberry32(hashSeed(`${input.story}|${input.caseType}|${input.relationship}|${input.severity}|${input.tone}`));
  const score = verdictScore(input.severity, input.tone);
  const tier = RESULTS.find((r) => score >= r.min) ?? RESULTS[RESULTS.length - 1];

  const excerpt = input.story.length > 40 ? `${input.story.slice(0, 40)}…` : input.story;
  const reasoning = [
    `피고인은 "${excerpt}"라는 취지의 행위에 이르렀다.`,
    pick(rand, REASONING_OPENERS),
    pick(rand, REASONING_CLOSERS[input.tone]),
  ].join(" ");

  // 사건명·죄명·주문이 논리적으로 묶인 시나리오를 하나 선택한다.
  const scenario = pick(rand, SCENARIOS[input.caseType]);

  return {
    caseNo: formatCaseNo(caseSeq),
    caseName: scenario.name,
    defendant: pick(rand, DEFENDANTS[input.relationship]),
    crime: scenario.crime,
    order: pick(rand, scenario.orders),
    reasoning,
    advice: pick(rand, ADVICE[input.caseType]),
    result: tier.result,
    resultNote: pick(rand, tier.notes),
  };
}

const APPEAL_OVERTURN_REASONS = [
  "원심은 피고인의 행위를 과도하게 해석하였다. 본 사안은 개인의 취향과 컨디션에 따라 변동될 수 있는 영역으로, 이를 형사적으로 책임지게 하는 것은 생활의 자유를 침해할 우려가 있다.",
  "항소심 재판부가 사건 기록을 다시 검토한 결과, 피고인의 행위는 비난 가능성은 있으나 처벌 가능성까지 인정하기는 어렵다고 판단하였다. 생활의 사소한 마찰까지 유죄로 다루는 것은 재판부의 품위에 맞지 않는다.",
];

const APPEAL_UPHOLD_REASONS = [
  "항소심 재판부가 기록을 재검토하였으나 원심의 판단은 경험칙과 사회 통념에 비추어 정당하다. 피고인의 항소 이유는 변명의 반복에 불과하므로 받아들이지 않는다.",
  "원심 판결에 사실 오인이나 양형 부당의 위법이 발견되지 않는다. 오히려 항소심 심리 과정에서 피고인의 태도가 재판부를 한 번 더 실망시켰음을 부기한다.",
];

export function generateAppeal(input: CaseInput, verdict: Verdict): AppealVerdict {
  const rand = mulberry32(hashSeed(`appeal|${verdict.caseNo}|${input.story}`));
  const alreadyAcquitted = verdict.result === "무죄" || verdict.result === "훈방 조치";
  // 이미 가벼운 처분이면 원심 유지, 그 외에는 수위가 낮을수록 파기 확률이 높다.
  const overturnChance = alreadyAcquitted ? 0 : 0.85 - verdictScore(input.severity, input.tone) * 0.1;
  const overturned = rand() < overturnChance;

  if (overturned) {
    return {
      order: "원심 파기. 무죄.",
      orderNote: "다만, 향후 동종 상황에서 적극적인 의견 제시와 배려에 임할 것을 권고한다.",
      reasoning: pick(rand, APPEAL_OVERTURN_REASONS),
      overturned: true,
    };
  }
  return {
    order: "항소 기각. 원심 유지.",
    orderNote: `원심 판결(${verdict.result})의 효력은 그대로 유지된다.`,
    reasoning: pick(rand, APPEAL_UPHOLD_REASONS),
    overturned: false,
  };
}

export const TRIAL_STEPS = [
  "사건 기록을 검토하는 중...",
  "증거 능력을 과도하게 판단하는 중...",
  "유사 생활사건을 검토하는 중...",
  "사회 통념을 지나치게 반영하는 중...",
  "재판부가 진지하게 고민하는 중...",
  "판결문 작성 중...",
] as const;
