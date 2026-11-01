import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CaseProvider } from "@/store/case-store";
import { TopBar } from "@/components/TopBar";
import { WakeBanner } from "@/components/WakeBanner";

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
  viewportFit: "cover",
  themeColor: "#3B2113",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <CaseProvider>
          <div id="app">
            <TopBar />
            <WakeBanner />
            {children}
          </div>
        </CaseProvider>
      </body>
    </html>
  );
}
