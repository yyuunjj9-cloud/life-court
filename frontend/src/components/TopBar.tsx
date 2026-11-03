"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/** 화면별 뒤로가기 목적지. 없으면 뒤로가기 버튼을 숨긴다. */
const BACK_MAP: Record<string, string> = {
  "/intake/story": "/",
  "/intake/type": "/intake/story",
  "/intake/tone": "/intake/type",
  "/intake/filing": "/intake/tone",
  "/complaint": "/intake/filing",
  "/demand": "/intake/filing",
  "/appeal": "/verdict",
  "/supreme": "/appeal",
  "/glossary": "/notice",
  "/countersuit": "/verdict",
  "/save": "/verdict",
};

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const back = BACK_MAP[pathname];
  // 안내 페이지는 어느 화면에서든 열 수 있으므로 보던 화면으로 되돌린다.
  const isNotice = pathname === "/notice";

  const backToPrevious = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <div className="bar">
      {isNotice ? (
        <button className="ico" type="button" onClick={backToPrevious} aria-label="뒤로가기">
          ‹
        </button>
      ) : back ? (
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
