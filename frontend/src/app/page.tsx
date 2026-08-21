"use client";

import { useRouter } from "next/navigation";
import { useCaseStore } from "@/store/case-store";

/* 01 랜딩 — 어두운 법정 */
export default function LandingPage() {
  const router = useRouter();
  const { savedDraftAt, resetCase, loadDraft } = useCaseStore();

  // 새 사건 접수: 이전 진행 상태를 완전히 초기화하고 시작한다.
  const startNew = () => {
    resetCase();
    router.push("/intake/story");
  };

  // 임시저장된 초안 불러오기
  const resume = () => {
    if (loadDraft()) router.push("/intake/story");
  };

  const savedLabel =
    savedDraftAt !== null
      ? new Date(savedDraftAt).toLocaleString("ko-KR", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

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
        <div className="stack">
          <button className="btn" type="button" onClick={startNew}>
            사건 접수하기
          </button>
          {savedLabel && (
            <button className="btn dark sm" type="button" onClick={resume}>
              임시저장 불러오기 ({savedLabel})
            </button>
          )}
        </div>
        <div className="disclaim">
          본 서비스는 오락 목적의 가상 콘텐츠이며
          <br />
          실제 법률 자문, 법률 판단 또는 실제 판결이 아닙니다.
        </div>
      </div>
    </div>
  );
}
