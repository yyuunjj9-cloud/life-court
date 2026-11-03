export interface ModerationIssue {
  /** invalid_nickname은 메모판 닉네임 규칙(운영자 사칭 등) 위반이다. */
  code: "abusive_language" | "personal_information" | "violent_threat" | "invalid_nickname";
  message: string;
}
