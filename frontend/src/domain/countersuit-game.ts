/**
 * 맞고소 반박 카드 게임 — 궤변마다 반박 카드 3장 중 맞는 것을 고른다.
 * 카드와 정답은 서버가 사건마다 정하고, 맞힌 수도 서버가 다시 계산한다.
 */

export interface CounterRound {
  claim: string;
  options: string[];
  answer: number;
}

/** 맞혔을 때와 틀렸을 때 재판부 반응 — 라운드 번호로 골라 같은 판에서 같은 말이 반복되지 않게 한다. */
const RIGHT_REACTIONS = [
  "재판부: 일리 있습니다. 기록에 남기겠습니다.",
  "재판부: 피고 측, 반론 있습니까? …없군요.",
  "재판부: 방청석에서 작은 박수가 나옵니다. 정숙하십시오.",
];

const WRONG_REACTIONS = [
  "재판부: …그건 다른 사건 이야기 같습니다만?",
  "재판부: 원고, 지금 무슨 말씀을 하시는 겁니까?",
  "재판부: 방청석이 술렁입니다. 정숙하십시오.",
];

export function reactionFor(round: number, right: boolean): string {
  const pool = right ? RIGHT_REACTIONS : WRONG_REACTIONS;
  return pool[round % pool.length];
}

/** 고른 카드로 맞힌 수 — 화면 게이지용. 최종 판정은 서버가 다시 계산한다. */
export function countHits(rounds: CounterRound[], picks: number[]): number {
  return rounds.filter((r, i) => picks[i] === r.answer).length;
}
