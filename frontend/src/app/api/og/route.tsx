/**
 * 사건별 동적 OG 카드 (1200×630).
 * 나눔명조 전체 글꼴(SIL OFL)을 임베드해 새 사건명·일반 분쟁 문구의
 * 한글도 누락 없이 표시한다. 라이선스는 같은 디렉터리의 OFL.txt 참조.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Node 런타임: 엣지의 1MB 번들 제한을 피하고, 폰트는 파일 트레이싱으로 함께 배포된다.
const extraBold = readFile(join(process.cwd(), "src/app/api/og/og-myeongjo-extrabold.ttf"));
const regular = readFile(join(process.cwd(), "src/app/api/og/og-myeongjo-regular.ttf"));

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // Keep preview labels bounded so arbitrary URLs cannot create unbounded cards.
  const caseName = (searchParams.get("n") ?? "").slice(0, 30);
  const crime = (searchParams.get("c") ?? "").slice(0, 30);
  const result = (searchParams.get("r") ?? "").slice(0, 20);

  const hasCase = caseName.length > 0 && crime.length > 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "linear-gradient(160deg, #3b2113 0%, #241207 70%, #1a0c05 100%)",
          fontFamily: "Myeongjo",
          position: "relative",
        }}
      >
        {/* 금박 테두리 */}
        <div
          style={{
            position: "absolute",
            top: 26,
            left: 26,
            right: 26,
            bottom: 26,
            border: "2px solid #8f7420",
            borderRadius: 6,
            boxShadow: "inset 0 0 0 5px rgba(201,162,39,0.18)",
          }}
        />
        <div style={{ position: "absolute", left: 66, top: 62, display: "flex", flexDirection: "column", color: "#c9a227" }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 5 }}>LIFE COURT</div>
          <div style={{ fontSize: 12, letterSpacing: 2, marginTop: 8, color: "#a8905c" }}>SMALL CASE. BIG DRAMA.</div>
        </div>
        {/* 결과 도장 */}
        {result.length > 0 && (
          <div
            style={{
              position: "absolute",
              right: 80,
              top: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 170,
              height: 170,
              borderRadius: 170,
              border: "5px solid #b3202c",
              color: "#c42b36",
              fontSize: result.length > 6 ? 30 : 40,
              fontWeight: 800,
              transform: "rotate(-12deg)",
              padding: 18,
              textAlign: "center",
              lineHeight: 1.25,
            }}
          >
            {result}
          </div>
        )}
        <div
          style={{
            fontSize: 25,
            letterSpacing: 14,
            color: "#c9a227",
            borderTop: "1px solid #8f7420",
            borderBottom: "1px solid #8f7420",
            padding: "10px 24px 10px 38px",
            marginBottom: 34,
          }}
        >
          오늘의 생활법원
        </div>
        <div
          style={{
            fontSize: hasCase ? 76 : 88,
            fontWeight: 800,
            color: "#e8c95c",
            marginBottom: 28,
            maxWidth: 1040,
            textAlign: "center",
          }}
        >
          {hasCase ? `『${caseName}』` : "판 결 문"}
        </div>
        <div style={{ fontSize: 34, color: "#e3cf96", display: "flex" }}>
          {hasCase ? `가상 죄명 · ${crime}` : "당신의 사소한 억울함을 엄숙하게 심리합니다."}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 44,
            fontSize: 20,
            letterSpacing: 2,
            color: "#a8905c",
          }}
        >
          life-court.vercel.app
        </div>
        <div style={{ position: "absolute", left: 70, bottom: 62, display: "flex", padding: "10px 22px", backgroundColor: "#f4e9d0", border: "3px solid #b3261e", color: "#b3261e", fontSize: 26, fontWeight: 800, transform: "rotate(-6deg)", boxShadow: "4px 4px 0 #6c1813" }}>
          Objection!
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Myeongjo", data: await regular, weight: 400, style: "normal" },
        { name: "Myeongjo", data: await extraBold, weight: 800, style: "normal" },
      ],
    },
  );
}
