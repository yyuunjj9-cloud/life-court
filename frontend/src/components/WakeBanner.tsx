"use client";

import { useEffect, useRef, useState } from "react";
import { api, subscribeConnection, type ConnState } from "@/lib/api";

const MAX_WAIT_SEC = 60;
/** 이만큼 넘게 기다렸다가 연결됐을 때만 '개정' 알림을 보여 준다. */
const OPENED_AFTER_MS = 3000;
const OPENED_SHOW_MS = 2000;

/**
 * 서버 연결 상태 배너.
 * - 진입 즉시 health를 호출해 잠든 백엔드(Render free)를 깨운다.
 * - 재시도가 진행되는 동안 경과 시간과 진행 바를 보여준다.
 * - 최종 실패 시 원인과 함께 다시 시도 버튼을 보여준다.
 */
export function WakeBanner() {
  const [conn, setConn] = useState<ConnState>({ phase: "idle", startedAt: 0, attempt: 0 });
  const [nowMs, setNowMs] = useState(0);
  // 한참 기다린 끝에 연결되면 '개정'을 잠깐 알린다 — 곧바로 연결되면 띄우지 않는다.
  const [opened, setOpened] = useState(false);
  const waitStarted = useRef(0);

  useEffect(
    () =>
      subscribeConnection((next) => {
        if (next.phase === "connecting" && !waitStarted.current) waitStarted.current = next.startedAt || Date.now();
        if (next.phase === "idle" && waitStarted.current) {
          if (Date.now() - waitStarted.current >= OPENED_AFTER_MS) setOpened(true);
          waitStarted.current = 0;
        }
        if (next.phase === "failed") waitStarted.current = 0;
        setConn(next);
      }),
    [],
  );

  useEffect(() => {
    if (!opened) return;
    const t = setTimeout(() => setOpened(false), OPENED_SHOW_MS);
    return () => clearTimeout(t);
  }, [opened]);

  // 연결 중일 때만 250ms 간격으로 경과 시간 갱신
  useEffect(() => {
    if (conn.phase !== "connecting") return;
    const t = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(t);
  }, [conn.phase]);

  // 첫 진입 시 서버 깨우기
  useEffect(() => {
    api.health().catch(() => {
      /* 실패 상태는 배너가 표시한다 */
    });
  }, []);

  if (conn.phase === "idle") {
    if (!opened) return null;
    return (
      <div className="conn-banner opened" role="status">
        <span className="cb-text">⚖️ 개정! 법정 문이 열렸습니다</span>
      </div>
    );
  }

  if (conn.phase === "failed") {
    return (
      <div className="conn-banner fail">
        <span className="cb-text">
          법정이 잠시 휴정 중입니다 <span className="cb-detail">(서버에 연결하지 못했어요 · {conn.error})</span>
        </span>
        <button
          className="cb-retry"
          type="button"
          onClick={() => {
            api.health().catch(() => {});
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  const elapsedSec = Math.max(0, Math.round(((nowMs || Date.now()) - conn.startedAt) / 1000));
  const pct = Math.min(96, (elapsedSec / MAX_WAIT_SEC) * 100);

  return (
    <div className="conn-banner">
      <span className="cb-text">
        <span className="cb-gavel">🔨</span> 법정 문을 여는 중… <b>{elapsedSec}초</b>
        {/* 재시도가 이어지면 1분을 넘길 수도 있어 상한을 약속하지 않는다 */}
        <span className="cb-detail"> (보통 30초~1분)</span>
      </span>
      <div className="cb-track">
        <div className="cb-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
