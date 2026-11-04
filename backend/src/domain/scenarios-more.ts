import type { CaseScenario, CaseType } from "./judgment";

/**
 * 2026-11 확장 시나리오. 기본 시나리오(judgment.ts) 뒤에 붙어 같은 규칙으로 고른다.
 * 문장 기준은 docs/humor-guide.md, 매칭 회귀는 backend/tests/scenario-more.test.cjs가 지킨다.
 * 초안 360개는 시험지에서 기존 사연의 오답률을 높여(22.4% → 26.4%) 아직 넣지 않았다. docs/plan-accuracy.md 참고.
 */
export const MORE_SCENARIOS: Record<CaseType, readonly CaseScenario[]> = {
  work: [],
  relationship: [],
  meal: [],
  messenger: [],
  money: [],
  romance: [],
  daily: [],
};
