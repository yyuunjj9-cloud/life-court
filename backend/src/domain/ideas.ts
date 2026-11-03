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
  status: IdeaStatus;
  createdAt: string;
}

export const IDEA_MIN = 2;
export const IDEA_MAX = 60;

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
