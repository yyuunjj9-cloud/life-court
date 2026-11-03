/**
 * 안내 페이지 '업데이트 예정 메모판'에 이용자가 붙이는 아이디어.
 *
 * 금칙어 필터가 모든 부적절한 표현을 막지는 못하므로, 공개를 원해도 운영자가
 * 확인하기 전에는 아무에게도 보이지 않는다. 비공개 아이디어는 운영자만 본다.
 */

import { createHash, timingSafeEqual } from "node:crypto";

export type IdeaStatus = "pending" | "approved" | "rejected" | "private";

export interface Idea {
  id: number;
  text: string;
  /** 이용자가 고른 별명. 없으면 화면이 '익명 시민'으로 보여 준다. */
  nickname: string | null;
  status: IdeaStatus;
  createdAt: string;
}

export const IDEA_MIN = 2;
export const IDEA_MAX = 60;
export const NICKNAME_MAX = 10;

/**
 * 운영 측으로 오해할 수 있는 이름. 메모판의 '운영자 아이디어' 표시를 흉내 내지 못하게 한다.
 * 띄어쓰기·구두점·전각 문자로 살짝 바꾼 표기도 정규화한 뒤 비교한다.
 */
const RESERVED_NAMES = /운영|관리자|관리인|어드민|admin|재판부|재판장|판사|법원|공식|official|staff|스태프|개발자|developer/;

/** 닉네임 검사 — 문제가 없으면 null, 있으면 이용자에게 보여 줄 안내. */
export function nicknameIssue(nickname: string): string | null {
  // 글자·숫자·띄어쓰기만 받는다. 이모지나 기호로 운영자 표시(갈색 꼬리표)를 흉내 내지 못하게 한다.
  if (!/^[\p{L}\p{N} ]+$/u.test(nickname)) return "닉네임에는 글자, 숫자, 띄어쓰기만 쓸 수 있습니다.";
  const normalized = nickname.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (RESERVED_NAMES.test(normalized)) return "운영자로 오해할 수 있는 이름은 닉네임으로 쓸 수 없습니다.";
  return null;
}

/**
 * 운영자 열쇠의 SHA-256. 192비트 난수 원본은 저장소 밖(운영자 PC)에만 둔다.
 * 열쇠를 바꿀 때는 이 값을 새 해시로 교체하거나 환경변수로 덮어쓴다.
 */
const ADMIN_TOKEN_SHA256 = process.env.ADMIN_TOKEN_SHA256
  ?? "e5b4a3467c6766c23e515816b2ffcb72c44fa13c927019d8cc2d2361c458ba8f";

export function validAdminToken(provided: unknown): boolean {
  if (typeof provided !== "string" || !/^[a-f0-9]{48}$/.test(provided)) return false;
  const digest = createHash("sha256").update(provided).digest();
  return timingSafeEqual(digest, Buffer.from(ADMIN_TOKEN_SHA256, "hex"));
}
