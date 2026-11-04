/**
 * 문서 타입 정의 (표시용). 생성 로직은 backend에 있다.
 */

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
