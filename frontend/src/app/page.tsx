import Link from "next/link";

/* 01 랜딩 — 어두운 법정 */
export default function LandingPage() {
  return (
    <div className="scr dark">
      <span className="pillar l" />
      <span className="pillar r" />
      <div className="objection">
        <div className="burst">이의 있음!</div>
      </div>
      <div className="pad">
        <span className="kicker">大 생활법원</span>
        <h1 className="hero-t">
          당신의 <span className="acc">사소한 억울함</span>을
          <br />
          엄숙하게 심리합니다.
        </h1>
        <p className="hero-s">
          점심 메뉴부터 읽씹 사건까지
          <br />
          생활법원이 공정하지 않게 심리합니다.
        </p>
        <div className="grow" />
        <div className="seal">
          <span className="g">⚖</span>
        </div>
        <div className="grow" />
        <Link className="btn" href="/intake/story">
          사건 접수하기
        </Link>
        <div className="disclaim">
          본 서비스는 오락 목적의 가상 콘텐츠이며
          <br />
          실제 법률 자문, 법률 판단 또는 실제 판결이 아닙니다.
        </div>
      </div>
    </div>
  );
}
