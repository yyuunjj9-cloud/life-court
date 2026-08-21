"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 화면별 뒤로가기 목적지. 없으면 뒤로가기 버튼을 숨긴다. */
const BACK_MAP: Record<string, string> = {
  "/intake/story": "/",
  "/intake/type": "/intake/story",
  "/intake/tone": "/intake/type",
  "/save": "/verdict",
  "/notice": "/",
};

export function TopBar() {
  const pathname = usePathname();
  const back = BACK_MAP[pathname];

  return (
    <div className="bar">
      {back ? (
        <Link className="ico" href={back} aria-label="뒤로가기">
          ‹
        </Link>
      ) : (
        <span className="ico ghost">‹</span>
      )}
      <Link className="brand" href="/">
        <span className="em">⚖</span>오늘의 생활법원
      </Link>
      <Link className="ico" href="/notice" aria-label="안내 사항">
        ☰
      </Link>
    </div>
  );
}
