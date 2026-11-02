/**
 * 피고 측 답변서 — 백엔드 domain/response.ts의 타입·선택지 미러.
 * 1단계: 자유 텍스트 없이 선택지만 허용한다(욕설·비방·실명이 구조적으로 불가능).
 * 문구(진술·재판부 결정)는 백엔드가 렌더링해 내려주고, 여기에는 버튼 표시용 라벨만 둔다.
 */

export interface DefenseResponseDoc {
  option: string;
  label: string;
  statement: string;
  ruling: string;
  declined: boolean;
}

export const DEFENSE_CHOICES: readonly { id: string; label: string }[] = [
  { id: "deny", label: "그런 사실이 전혀 없습니다 (전면 부인)" },
  { id: "justify", label: "사실이나, 그럴 만한 사정이 있었습니다" },
  { id: "memory", label: "기억이 나지 않습니다" },
  { id: "apologize", label: "잘못했습니다, 진심으로 사과합니다" },
  { id: "counter", label: "오히려 제가 피해자입니다" },
] as const;

export const DECLINE_CHOICE = { id: "decline", label: "응소하지 않겠습니다 (사건 종결)" } as const;
