/**
 * 맞고소 혼자 변론 게임 규칙 — 궤변 끝부분이 빨개지는 순간 이의를 제기한다.
 * 화면과 분리해 두어야 판정 기준을 테스트로 고정할 수 있다.
 */

/**
 * 라운드별 판정 창(ms) — 갈수록 짧아진다. 평균 반응 속도(약 0.25초)와 터치 지연을
 * 감안해 3라운드도 집중하면 막을 수 있게 하되, 다 막는 '완벽 변론'은 쉽지 않게 둔다.
 */
export const ROUND_WINDOWS_MS = [700, 500, 350] as const;
/** 글자당 표시 간격과 문장 하나의 최대 표시 시간 — 긴 문장도 기다림이 길어지지 않게 한다. */
export const CHAR_MS = 40;
export const TYPE_MAX_MS = 2200;
/** 판정을 보여준 뒤 다음 라운드까지의 간격 */
export const NEXT_ROUND_MS = 700;

export type PressResult = "hit" | "early" | "miss";

/** 문장이 다 나와 끝부분이 빨개지는 데 걸리는 시간(ms) */
export function typingDuration(line: string): number {
  return Math.min(CHAR_MS * line.length, TYPE_MAX_MS);
}

/**
 * pressAt은 라운드 시작부터 누른 시점(ms), 누르지 않았으면 null.
 * 빨개지기 전에 누르면 너무 이른 이의, 창이 끝난 뒤면 놓친 것이다.
 */
export function judgePress(pressAt: number | null, redAt: number, windowMs: number): PressResult {
  if (pressAt === null) return "miss";
  if (pressAt < redAt) return "early";
  return pressAt <= redAt + windowMs ? "hit" : "miss";
}

/** 빨개질 끝부분의 시작 위치 — 어절 단위로 고르고, 마지막 어절이 짧으면 앞 어절을 붙인다. */
export function redTailStart(line: string): number {
  let start = line.lastIndexOf(" ") + 1;
  while (line.length - start < 4) {
    const prev = line.lastIndexOf(" ", start - 2);
    // 앞에 어절이 하나뿐이면 문장 전체가 빨개지지 않도록 마지막 어절만 둔다.
    if (prev < 0) break;
    start = prev + 1;
  }
  return start;
}
