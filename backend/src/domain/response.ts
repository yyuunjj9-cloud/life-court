/**
 * 피고 측 답변서 — 공유 링크를 받은 실제 상대가 제출하는 응답.
 *
 * 1단계(리스크 최소화): 자유 텍스트 없이 준비된 선택지만 허용한다.
 * 욕설·비방·실명 노출이 구조적으로 불가능하도록 입력란 자체를 두지 않는다.
 * 답변은 사건당 1회만 접수되며(선착), 재판부 결정은 원심 판결을 변경하지 않는
 * 부가 문서로만 발부된다.
 */

export interface DefenseOption {
  id: string;
  /** 피고가 보는 선택지 버튼 문구 */
  label: string;
  /** 답변서 본문 — 피고의 진술로 기록된다 */
  statement: string;
  /** 답변서에 대한 재판부 결정 */
  ruling: string;
}

export const DEFENSE_OPTIONS: readonly DefenseOption[] = [
  {
    id: "deny",
    label: "그런 사실이 전혀 없습니다 (전면 부인)",
    statement: "피고인은 공소사실을 전면 부인하며, 그러한 일은 피고인의 기억 속에 존재하지 않는다고 주장한다.",
    ruling:
      "원고의 진술이 구체적이고 일관된 반면, 피고인의 부인에는 아무런 증거가 뒷받침되지 아니한다. 피고인의 항변을 배척하고 원심판결을 그대로 유지한다.",
  },
  {
    id: "justify",
    label: "사실이나, 그럴 만한 사정이 있었습니다",
    statement: "피고인은 행위 사실 자체는 인정하되, 당시 피치 못할 사정이 있었다고 항변한다.",
    ruling:
      "피고인이 사실관계를 인정한 점은 정상에 참작한다. 다만 '피치 못할 사정'의 구체적 내용은 끝내 제출되지 아니하였으므로 원심판결을 유지한다.",
  },
  {
    id: "memory",
    label: "기억이 나지 않습니다",
    statement: "피고인은 해당 일시의 일을 전혀 기억하지 못한다고 진술한다.",
    ruling:
      "같은 날 점심 메뉴는 정확히 기억하면서 본건만 기억나지 않는다는 주장은 경험칙에 반하므로 받아들이지 아니한다. 원심판결을 유지한다.",
  },
  {
    id: "apologize",
    label: "잘못했습니다, 진심으로 사과합니다",
    statement: "피고인은 공소사실을 모두 인정하고, 원고에게 진심 어린 사과의 뜻을 전한다.",
    ruling:
      "피고인의 자백과 진지한 반성을 정상에 참작하여 원심판결의 형은 그 집행을 유예한다. 쌍방은 서로의 하루를 묻는 안부 한마디로 화해할 것을 권고한다.",
  },
  {
    id: "counter",
    label: "오히려 제가 피해자입니다",
    statement: "피고인은 본건의 진정한 피해자는 오히려 자신이라고 주장하며 억울함을 호소한다.",
    ruling:
      "그 억울함은 별도의 사건 접수를 통하여 해소할 것을 안내한다. 본건에 관한 한 원심판결을 유지한다.",
  },
] as const;

/** 응소 거부 — 피고 보호 장치. 선택 시 사건은 원심 확정으로 종결된다. */
export const DECLINE_OPTION: DefenseOption = {
  id: "decline",
  label: "응소하지 않겠습니다 (사건 종결)",
  statement: "피고인은 본건에 응소하지 아니하였다.",
  ruling: "피고인이 응소를 거부함에 따라 본 사건은 원심판결 확정으로 종결한다. 재판부는 쌍방의 평온한 일상 복귀를 기원한다.",
};

const ALL_OPTIONS: readonly DefenseOption[] = [...DEFENSE_OPTIONS, DECLINE_OPTION];

export const RESPONSE_OPTION_IDS: readonly string[] = ALL_OPTIONS.map((o) => o.id);

/** 저장 형태 — 선택지 id만 저장하고 문구는 읽을 때 렌더링한다(문구 개선이 과거 사건에도 반영되도록). */
export interface DefenseResponse {
  option: string;
}

export interface DefenseResponseDoc {
  option: string;
  label: string;
  statement: string;
  ruling: string;
  declined: boolean;
}

export function renderDefenseResponse(option: string): DefenseResponseDoc | null {
  const found = ALL_OPTIONS.find((o) => o.id === option);
  if (!found) return null;
  return {
    option: found.id,
    label: found.label,
    statement: found.statement,
    ruling: found.ruling,
    declined: found.id === "decline",
  };
}
