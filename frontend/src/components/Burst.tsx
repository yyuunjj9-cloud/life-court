/**
 * 만화풍 외침 말풍선 (이의 있음! / 판결 선고! / 맞고소?!).
 * 3중 스타버스트(진홍 테두리 → 붉은 그라데이션 → 양피지 내부) 위에
 * 임팩트 폰트(BurstHan) 텍스트를 그림자·크림 외곽선·그라데이션의 3겹으로 얹는다.
 * 점 좌표는 고정 지터로 결정적으로 생성돼 서버/클라이언트 렌더가 일치한다.
 */

import { useId } from "react";

const SPIKES = 12;
const JITTER = [0, 5, -3, 7, -2, 4, -5, 3, 6, -4, 2, -6];

function starPoints(cx: number, cy: number, rx: number, ry: number, innerRatio: number): string {
  const pts: string[] = [];
  for (let i = 0; i < SPIKES * 2; i++) {
    const isOuter = i % 2 === 0;
    const jitter = isOuter ? JITTER[(i / 2) % JITTER.length] : 0;
    const scale = isOuter ? 1 + jitter / 100 : innerRatio;
    const angle = (Math.PI * i) / SPIKES - Math.PI / 2 + 0.13;
    pts.push(`${(cx + rx * scale * Math.cos(angle)).toFixed(1)},${(cy + ry * scale * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(" ");
}

const OUTER = starPoints(130, 80, 124, 74, 0.74);
const MID = starPoints(130, 80, 116, 68, 0.76);
const INNER = starPoints(130, 80, 103, 59, 0.78);

const FONT = "'BurstHan','Black Han Sans','Malgun Gothic',sans-serif";

export function Burst({ text, width = 170, variant = "objection" }: { text: string; width?: number; variant?: "objection" | "overruled" | "sustained" | "dismissed" | "inadmissible" }) {
  const id = useId().replace(/:/g, "");
  const overruled = variant === "overruled";
  const sustained = variant === "sustained";
  const dismissed = variant === "dismissed";
  const inadmissible = variant === "inadmissible";
  const palette = inadmissible
    ? { edge: "#543C1F", bright: "#A48148", dark: "#76562C", ink: "#775429" }
    : dismissed
    ? { edge: "#302722", bright: "#796554", dark: "#44382E", ink: "#514133" }
    : sustained
    ? { edge: "#11382C", bright: "#477D5D", dark: "#1B503B", ink: "#245A40" }
    : overruled
    ? { edge: "#102638", bright: "#426A85", dark: "#17384F", ink: "#21465F" }
    : { edge: "#5E0D08", bright: "#D6432F", dark: "#8F1610", ink: "#B3261E" };
  // 글자 수에 따라 크기를 조절해 버스트를 꽉 채운다 (공백 제외)
  const glyphs = text.replace(/\s/g, "").length;
  const latin = /^[A-Za-z !?]+$/.test(text);
  const fontSize = latin ? 46 : glyphs <= 4 ? 54 : glyphs === 5 ? 48 : 42;

  const textAttrs = {
    x: 130,
    y: latin ? 75 : 82,
    textAnchor: "middle" as const,
    dominantBaseline: "central" as const,
    fontFamily: latin ? "Impact, 'Arial Black', sans-serif" : FONT,
    fontWeight: latin ? 900 : undefined,
    fontStyle: latin ? "italic" : undefined,
    textLength: latin ? 205 : undefined,
    lengthAdjust: "spacingAndGlyphs" as const,
    fontSize,
    letterSpacing: "-1",
  };

  return (
    <svg
      viewBox="0 0 260 160"
      width={width}
      height={(width * 160) / 260}
      role="img"
      aria-label={inadmissible ? `${text} 진술 보완 요청` : dismissed ? `${text} 맞고소 기각 또는 각하` : sustained ? `${text} 원심 파기, 무죄` : overruled ? `${text} 항소 기각` : text}
    >
      <defs>
        <linearGradient id={`${id}-red`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.bright} />
          <stop offset="1" stopColor={palette.dark} />
        </linearGradient>
        <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDF8EA" />
          <stop offset="1" stopColor="#F0E4C8" />
        </linearGradient>
        <linearGradient id={`${id}-text`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.bright} />
          <stop offset="0.55" stopColor={palette.ink} />
          <stop offset="1" stopColor={palette.edge} />
        </linearGradient>
      </defs>

      {/* 외곽 어두운 테두리 → 붉은 버스트 → 양피지 내부 */}
      <polygon points={OUTER} fill={palette.edge} />
      <polygon points={MID} fill={`url(#${id}-red)`} />
      <polygon points={INNER} fill={`url(#${id}-paper)`} stroke={palette.ink} strokeWidth="2.5" />

      {/* 텍스트: 기울임 + 그림자 → 크림 외곽선 → 그라데이션 본체 */}
      <g transform="rotate(-4 130 80) skewX(-4)">
        <text {...textAttrs} transform="translate(3.5 5)" fill={palette.edge} opacity="0.85">
          {text}
        </text>
        <text
          {...textAttrs}
          fill={`url(#${id}-text)`}
          stroke="#FDF8EA"
          strokeWidth="8"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {text}
        </text>
        {latin && <text x="128" y="118" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="8.5" fontWeight="700" letterSpacing="1.1" fill={palette.ink}>
          {inadmissible ? "PLEASE REPHRASE" : dismissed ? "THIS CASE IS CLOSED" : sustained ? "OBJECTION ACCEPTED" : overruled ? "THE COURT HAS SPOKEN" : "I OBJECT, YOUR HONOR"}
        </text>}
      </g>
    </svg>
  );
}
