import type { Metadata, Viewport } from "next";
import { Anton } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { CaseProvider } from "@/store/case-store";
import { TopBar } from "@/components/TopBar";
import { WakeBanner } from "@/components/WakeBanner";

/**
 * 영어 외침(Objection! 등) 글꼴. Impact는 아이폰·안드로이드에 없어 기기마다 다른 글꼴로 바뀌며
 * 글자가 눌리거나 테두리에 닿았다. 비슷한 오픈 라이선스 글꼴을 빌드 때 받아 직접 제공한다.
 */
const burstLatin = Anton({ weight: "400", subsets: ["latin"], variable: "--font-burst-latin", display: "block" });

export const metadata: Metadata = {
  metadataBase: new URL("https://life-court.vercel.app"),
  title: "오늘의 생활법원",
  description: "당신의 사소한 억울함을 엄숙하게 심리합니다. 오락 목적의 가상 판결 서비스.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "생활법원",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "오늘의 생활법원",
    title: "오늘의 생활법원",
    description: "당신의 사소한 억울함을 엄숙하게 심리합니다. 점심 메뉴부터 읽씹 사건까지.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "오늘의 생활법원" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "오늘의 생활법원",
    description: "당신의 사소한 억울함을 엄숙하게 심리합니다.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // iOS의 입력란 포커스 자동 확대(뒤로 가기 후에도 줌 유지) 억제 — 핀치 줌은 iOS가 계속 허용한다.
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#3B2113",
  // 휴대폰 자동 다크 모드가 색을 뒤집어 외침 글자가 흰색처럼 보이지 않게 한다 — 이 앱은 자체 색을 쓴다.
  colorScheme: "only light",
};

/**
 * 인앱 브라우저(카톡·인스타·네이버 등)는 dvh를 주소창 숨김 기준으로 잘못 보고해
 * 상단 콘텐츠가 주소창 뒤로 숨는다. 페인트 전에 클래스를 달아 svh 레이아웃으로 전환한다.
 */
const INAPP_DETECT = `if(/KAKAOTALK|Instagram|NAVER|Line\\/|FBAN|FBAV/i.test(navigator.userAgent))document.documentElement.classList.add("inapp");`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={burstLatin.variable}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: INAPP_DETECT }} />
        <CaseProvider>
          <div id="app">
            <TopBar />
            <WakeBanner />
            {children}
          </div>
        </CaseProvider>
        <Analytics />
      </body>
    </html>
  );
}
