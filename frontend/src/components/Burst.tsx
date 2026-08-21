/**
 * 역전재판풍 외침 말풍선 (이의 있음! / 판결 선고! / 맞고소?!).
 * 3중 스타버스트(진홍 테두리 → 붉은 그라데이션 → 양피지 내부) 위에
 * 임팩트 폰트(BurstHan) 텍스트를 그림자·크림 외곽선·그라데이션의 3겹으로 얹는다.
 * 점 좌표는 고정 지터로 결정적으로 생성돼 서버/클라이언트 렌더가 일치한다.
 */

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

export function Burst({ text, width = 170 }: { text: string; width?: number }) {
  // 글자 수에 따라 크기를 조절해 버스트를 꽉 채운다 (공백 제외)
  const glyphs = text.replace(/\s/g, "").length;
  const fontSize = glyphs <= 4 ? 54 : glyphs === 5 ? 48 : 42;

  const textAttrs = {
    x: 130,
    y: 82,
    textAnchor: "middle" as const,
    dominantBaseline: "central" as const,
    fontFamily: FONT,
    fontSize,
    letterSpacing: "-1",
  };

  return (
    <svg
      viewBox="0 0 260 160"
      width={width}
      height={(width * 160) / 260}
      role="img"
      aria-label={text}
    >
      <defs>
        <linearGradient id="burst-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C93A2E" />
          <stop offset="1" stopColor="#8F1610" />
        </linearGradient>
        <linearGradient id="burst-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDF8EA" />
          <stop offset="1" stopColor="#F0E4C8" />
        </linearGradient>
        <linearGradient id="burst-text" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D6432F" />
          <stop offset="0.55" stopColor="#B3261E" />
          <stop offset="1" stopColor="#7C1210" />
        </linearGradient>
      </defs>

      {/* 외곽 어두운 테두리 → 붉은 버스트 → 양피지 내부 */}
      <polygon points={OUTER} fill="#5E0D08" />
      <polygon points={MID} fill="url(#burst-red)" />
      <polygon points={INNER} fill="url(#burst-paper)" stroke="#B3261E" strokeWidth="2.5" />

      {/* 텍스트: 기울임 + 그림자 → 크림 외곽선 → 그라데이션 본체 */}
      <g transform="rotate(-4 130 80) skewX(-4)">
        <text {...textAttrs} transform="translate(3.5 5)" fill="#4A0B07" opacity="0.85">
          {text}
        </text>
        <text
          {...textAttrs}
          fill="url(#burst-text)"
          stroke="#FDF8EA"
          strokeWidth="8"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {text}
        </text>
      </g>
    </svg>
  );
}
