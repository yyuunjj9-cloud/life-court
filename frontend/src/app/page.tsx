"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Burst } from "@/components/Burst";
import { fetchBoard, type BoardData } from "@/lib/api";
import { useCaseStore } from "@/store/case-store";

/** 접수 전에 결과물을 맛보게 하는 예시 — 실제 판결 생성 결과와 같은지 테스트로 고정한다. */
const SAMPLE = {
  story: "친구가 약속에 40분 늦고는 사과도 없이 배고프다며 메뉴부터 골랐어요.",
  crime: "약속 지각죄",
  order: "피고인은 지각 1회당 음료 1잔의 벌칙에 서면 동의할 것.",
};

/* 01 랜딩 — 어두운 법정 */
export default function LandingPage() {
  const router = useRouter();
  const { savedDraftAt, resetCase, loadDraft, verdict, draft } = useCaseStore();
  // 버스트 탭 이스터에그 — key를 바꿔 등장 애니메이션을 다시 재생한다.
  const [slam, setSlam] = useState(0);

  // 로고를 눌러 홈에 온 사용자가 진행 중이던 사건을 잃지 않도록 복귀 경로를 제공한다.
  const hasVerdict = Boolean(verdict);
  const hasDraft = !hasVerdict && draft.story.trim().length > 0;

  // 전광판 — 서버가 잠들어 있으면 조용히 생략된다.
  const [board, setBoard] = useState<BoardData | null>(null);
  useEffect(() => {
    let alive = true;
    fetchBoard().then((b) => {
      if (alive) setBoard(b);
    });
    return () => {
      alive = false;
    };
  }, []);

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
      <div
        className="objection tappable"
        key={slam}
        onClick={() => {
          setSlam((n) => n + 1);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(30);
        }}
      >
        <Burst text="Objection!" width={104} />
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
        <div className="sample-verdict">
          <span className="sv-tag">판결 예시</span>
          <p className="sv-story">“{SAMPLE.story}”</p>
          <p className="sv-crime">{SAMPLE.crime}</p>
          <p className="sv-order">{SAMPLE.order}</p>
        </div>
        <div className="grow" />
        {board && board.recent.length > 0 && (
          <div className="board" aria-label="실시간 심리 현황">
            <div className="board-head">
              <span className="board-live">● LIVE</span>
              금일 심리 {board.todayCount}건 · 누적 {board.totalCount}건
              {board.topCrime ? ` · 최다 죄목 ${board.topCrime}` : ""}
            </div>
            <div className="board-ticker">
              <div className="board-track">
                {[0, 1].map((copy) => (
                  <div className="board-group" key={copy} aria-hidden={copy === 1}>
                    {board.recent.map((e) => (
                      <span className="board-item" key={`${copy}-${e.caseNo}`}>
                        {e.caseNo} <b>{e.crime}</b> — {e.result}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="stack">
          <button className="btn" type="button" onClick={startNew}>
            {hasVerdict || hasDraft ? "새 사건 접수하기" : "사건 접수하기"}
          </button>
          <p className="cta-note">가입 없이, 한 줄이면 충분합니다.</p>
          {hasVerdict && (
            <button className="btn dark sm" type="button" onClick={() => router.push("/verdict")}>
              진행 중인 사건 보기
            </button>
          )}
          {hasDraft && (
            <button className="btn dark sm" type="button" onClick={() => router.push("/intake/story")}>
              작성 중인 사연 이어가기
            </button>
          )}
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
          <br />© 2026 오늘의 생활법원
        </div>
      </div>
    </div>
  );
}
