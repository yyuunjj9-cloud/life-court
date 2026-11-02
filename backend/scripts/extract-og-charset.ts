/**
 * OG 이미지에 등장할 수 있는 모든 글자를 추출해 폰트 서브셋용 charset을 만든다.
 * 시나리오를 추가·수정하면 이 스크립트를 다시 돌려 og-charset.txt를 뽑고,
 * subset-font로 나눔명조를 서브셋해 frontend/src/app/api/og/의 ttf 두 개를 교체할 것.
 * 실행: backend 디렉터리에서 `npx tsx scripts/extract-og-charset.ts`
 */
import { writeFileSync } from "node:fs";
import { SCENARIOS } from "../src/domain/judgment";

const RESULTS = ["괘씸죄 가중 유죄", "유죄", "조건부 유죄", "훈방 조치", "무죄"];
const LABELS = "오늘의 생활법원 판결문 판결 선고 가상 죄명 사건 공유받은 당신의 사소한 억울함을 엄숙하게 심리합니다 이의 있음! 회사생활 인간관계 식사 메신저 일상 분쟁 생활 배려 의무 소홀 혐의『』·—";

const chars = new Set<string>();
for (const list of Object.values(SCENARIOS)) {
  for (const s of list) for (const ch of s.name + s.crime) chars.add(ch);
}
for (const ch of RESULTS.join("") + LABELS) chars.add(ch);
for (let c = 32; c < 127; c++) chars.add(String.fromCharCode(c));

const out = [...chars].join("");
writeFileSync("og-charset.txt", out, "utf8");
console.log(`glyphs: ${chars.size}`);
