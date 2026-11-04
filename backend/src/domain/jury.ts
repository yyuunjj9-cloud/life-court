/**
 * 생활 배심원단 — 공유 링크를 받은 사람이 유·무죄에 투표한다.
 *
 * 실제 국민참여재판처럼 배심원 평결은 재판부 판결을 바꾸지 않는 참고 의견이다
 * (국민의 형사재판 참여에 관한 법률 제46조 제5항). 입력은 버튼뿐이라 금칙어 검사가 필요 없다.
 * 한 기기에 한 표가 기본이지만, 기기 저장값을 지우면 다시 투표할 수 있어 중복을 완전히 막지는 못한다.
 */

export type JuryVote = "guilty" | "not_guilty";

export const JURY_VOTES: readonly JuryVote[] = ["guilty", "not_guilty"];

export interface JuryTally {
  guilty: number;
  notGuilty: number;
  /** 이 기기가 낸 표 — 소유자 조회나 투표 전이면 null */
  mine: JuryVote | null;
}

/** 기기마다 만드는 투표자 표시. 개인을 알아볼 수 없는 난수다. */
export function validVoter(voter: unknown): voter is string {
  return typeof voter === "string" && /^[a-f0-9]{32,64}$/.test(voter);
}
