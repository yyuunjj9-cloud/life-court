"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Burst } from "@/components/Burst";
import { fetchBoard, type BoardData } from "@/lib/api";
import { useCaseStore } from "@/store/case-store";
import { landingSample } from "@/domain/samples";

/** 전광판 속도(px/s) — 내용 길이와 무관하게 일정해야 긴 죄목이 몰려도 읽을 수 있다. */
const BOARD_SPEED = 60;

/** 홈에 다시 올 때 마지막 전광판을 바로 보여준다 — 응답을 기다리는 동안 빈 칸이 되지 않게. */
let boardCache: BoardData | null = null;

/* 01 랜딩 — 어두운 법정 */
export default function LandingPage() {
  const router = useRouter();
  const { savedDraftAt, resetCase, loadDraft, verdict, draft } = useCaseStore();
  // 버스트 탭 이스터에그 — key를 바꿔 등장 애니메이션을 다시 재생한다.
  const [slam, setSlam] = useState(0);
  // 접수 전에 결과물을 맛보게 하는 판결 예시 — 하루에 한 번 바뀐다.
  const [sample] = useState(() => landingSample());

  // 로고를 눌러 홈에 온 사용자가 진행 중이던 사건을 잃지 않도록 복귀 경로를 제공한다.
  const hasVerdict = Boolean(verdict);
  const hasDraft = !hasVerdict && draft.story.trim().length > 0;

  // 전광판 — 자리는 처음부터 잡아 두고 내용만 바꾼다. 응답이 온 뒤에 끼워 넣으면
  // 판결 예시와 버튼이 뒤늦게 밀린다. 서버가 잠들어 있으면 안내 문구로 대신한다.
  const [board, setBoard] = useState<BoardData | null>(boardCache);
  const [boardFailed, setBoardFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchBoard().then((b) => {
      if (b) boardCache = b;
      if (!alive) return;
      if (b) setBoard(b);
      else setBoardFailed(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 글꼴 로딩으로 폭이 바뀌어도 속도가 유지되도록 ResizeObserver로 한 바퀴 시간을 잰다.
  const boardGroup = useRef<HTMLDivElement>(null);
  const [boardDuration, setBoardDuration] = useState<number | null>(null);
  const [boardHeld, setBoardHeld] = useState(false);
  useEffect(() => {
    const group = boardGroup.current;
    if (!group) return;
    const observer = new ResizeObserver(() => setBoardDuration(group.offsetWidth / BOARD_SPEED));
    observer.observe(group);
    return () => observer.disconnect();
  }, [board]);

  // 새 사건 접수: 이전 진행 상태를 완전히 초기화하고 시작한다.
  const startNew = () => {
    resetCase();
    router.push("/intake/story");
  };

  // 임시저장된 초안 불러오기
  const resume = () => {
    if (loadDraft()) router.push("/intake/story");
  };

  const boardIdle = board
    ? board.recent.length === 0 && "오늘의 첫 사건을 기다리고 있습니다"
    : boardFailed
      ? "심리 현황은 잠시 후 공개됩니다"
      : "심리 현황 집계 중…";

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
          {/* 이 서비스의 반전 — 엄숙한 척하지만 공정하지는 않다 */}
          생활법원이 <em className="twist">공정하지 않게</em> 심리합니다.
        </p>
        <div className="grow" />
        <div className="sample-verdict">
          <span className="sv-tag">판결 예시</span>
          <p className="sv-story">“{sample.story}”</p>
          <p className="sv-crime">{sample.crime}</p>
          <p className="sv-order">{sample.order}</p>
        </div>
        <div className="grow" />
        <div className="board" aria-label="실시간 심리 현황">
          <div className="board-head">
            <span className="board-live">● LIVE</span>
            <span className="board-stat">
              {board
                ? `금일 심리 ${board.todayCount}건 · 누적 ${board.totalCount}건${board.topCrime ? ` · 최다 죄목 ${board.topCrime}` : ""}`
                : "실시간 심리 현황"}
            </span>
          </div>
          {board && !boardIdle ? (
            <div
              className="board-ticker"
              onPointerDown={() => setBoardHeld(true)}
              onPointerUp={() => setBoardHeld(false)}
              onPointerCancel={() => setBoardHeld(false)}
              onPointerLeave={() => setBoardHeld(false)}
            >
              <div
                className={boardHeld ? "board-track held" : "board-track"}
                style={boardDuration ? { animationDuration: `${boardDuration}s` } : undefined}
              >
                {[0, 1].map((copy) => (
                  <div className="board-group" key={copy} ref={copy === 0 ? boardGroup : undefined} aria-hidden={copy === 1}>
                    {board.recent.map((e) => (
                      <span className="board-item" key={`${copy}-${e.caseNo}`}>
                        {e.caseNo} <b>{e.crime}</b> — {e.result}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // 흐르는 줄과 같은 구조로 높이를 맞추고, 움직임만 멈춘다.
            <div className="board-ticker">
              <div className="board-track idle">
                <div className="board-group">
                  <span className="board-item">{boardIdle}</span>
                </div>
              </div>
            </div>
          )}
        </div>
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
