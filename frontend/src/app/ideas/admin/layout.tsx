import type { Metadata } from "next";

// 운영자 화면 — 검색에 노출하지 않고, 다른 사이트로 주소(열쇠 조각 포함)를 넘기지 않는다.
export const metadata: Metadata = {
  title: "메모판 운영",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function IdeasAdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
