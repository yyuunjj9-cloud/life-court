import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CaseProvider } from "@/store/case-store";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "오늘의 생활법원",
  description: "당신의 사소한 억울함을 엄숙하게 심리합니다. 오락 목적의 가상 판결 서비스.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <CaseProvider>
          <div id="app">
            <TopBar />
            {children}
          </div>
        </CaseProvider>
      </body>
    </html>
  );
}
