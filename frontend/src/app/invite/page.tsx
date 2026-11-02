import type { Metadata } from "next";
import LandingPage from "@/app/page";

export const metadata: Metadata = {
  title: "그 사소한 억울함, 판결받고 가세요 | 오늘의 생활법원",
  description: "약속에 늦은 친구부터 읽씹하는 동료까지. 당신의 사소한 억울함을 엄숙하고 유쾌하게 심리합니다. 판결문을 만들어 친구에게 보내보세요.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/invite",
    title: "그 사소한 억울함, 판결받고 가세요 ⚖",
    description: "말로는 억울하고, 판결문으로는 통쾌하게. 오늘의 생활법원에 사건을 접수하세요.",
    images: [{ url: "/api/og?invite=1", width: 1200, height: 630, alt: "그 사소한 억울함, 판결받고 가세요 — 오늘의 생활법원 초대장" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "그 사소한 억울함, 판결받고 가세요 ⚖",
    description: "친구와 가볍게 즐기는 가상 법정. 사연을 넣고 판결문을 공유해보세요.",
    images: ["/api/og?invite=1"],
  },
};

// A social invitation, not a protected preview or an extra conversion step.
export default function InvitePage() { return <LandingPage />; }
