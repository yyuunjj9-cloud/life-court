/**
 * 역전재판풍 외침 말풍선 (이의 있음! / 판결 선고! / 맞고소?!).
 * 붉은 스타버스트 위에 양피지 내부, 세리프 강조 텍스트를 얹은 SVG.
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

export function Burst({ text, width = 170 }: { text: string; width?: number }) {
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
      </defs>
      {/* 외곽 어두운 테두리 → 붉은 버스트 → 양피지 내부 */}
      <polygon points={OUTER} fill="#5E0D08" />
      <polygon points={MID} fill="url(#burst-red)" />
      <polygon points={INNER} fill="url(#burst-paper)" stroke="#B3261E" strokeWidth="2.5" />
      <text
        x="130"
        y="80"
        textAnchor="middle"
        dominantBaseline="central"
        transform="rotate(-3 130 80)"
        fontFamily="'Nanum Myeongjo','Noto Serif KR','Batang','바탕',serif"
        fontSize="36"
        fontWeight="900"
        fill="#8F1610"
        letterSpacing="1"
      >
        {text}
      </text>
    </svg>
  );
}
