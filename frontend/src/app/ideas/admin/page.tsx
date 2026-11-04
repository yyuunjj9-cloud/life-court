"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ideasApi, type AdminIdea, type UsageStats } from "@/lib/api";

const TOKEN_KEY = "lifecourt.adminToken";

const STATUS_LABEL: Record<AdminIdea["status"], string> = {
  pending: "공개 요청 · 확인 대기",
  approved: "공개 중",
  rejected: "숨김",
  private: "운영자에게만",
};

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="admin-stat">
      <span className="k">{label}</span>
      <b>{value}</b>
      <span className="n">{note}</span>
    </div>
  );
}

function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/* 메모판 운영 — 운영자 열쇠가 있는 기기에서만 비공개 의견과 공개 요청을 보고 승인한다. */
export default function IdeasAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<AdminIdea[] | null>(null);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 즐겨찾기 주소의 #k=열쇠는 이 기기에 저장하고 주소창에서 바로 지운다.
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("k");
    if (fromHash) {
      try {
        window.localStorage.setItem(TOKEN_KEY, fromHash);
      } catch {
        /* 저장할 수 없으면 이번 방문에만 쓴다 */
      }
      window.history.replaceState(null, "", window.location.pathname);
    }
    setToken(fromHash ?? readToken());
  }, []);

  const load = useCallback(async (key: string) => {
    try {
      const [list, usage] = await Promise.all([ideasApi.adminList(key), ideasApi.stats(key)]);
      setIdeas(list.ideas);
      setStats(usage);
      setError(null);
    } catch {
      setError("열쇠가 맞지 않거나 서버에 연결할 수 없습니다.");
    }
  }, []);

  useEffect(() => {
    if (token) load(token);
  }, [token, load]);

  const review = async (id: number, status: "approved" | "rejected") => {
    if (!token) return;
    try {
      await ideasApi.review(token, id, status);
      await load(token);
    } catch {
      setError("처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.");
    }
  };

  if (!token) {
    return (
      <div className="scr">
        <div className="pad">
          <h1 className="tt">운영자 화면</h1>
          <p className="sub">운영자 열쇠가 담긴 주소로 들어와야 합니다.</p>
          <div className="grow" />
          <Link className="btn" href="/" style={{ textAlign: "center", textDecoration: "none" }}>
            메인으로
          </Link>
        </div>
      </div>
    );
  }

  const waiting = ideas?.filter((i) => i.status === "pending").length ?? 0;

  // 공용 기기에서 쓴 뒤에는 이 기기의 열쇠를 지울 수 있다. 서버의 열쇠는 그대로다.
  const forget = () => {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* 저장소를 쓸 수 없는 브라우저 */
    }
    setToken(null);
  };

  return (
    <div className="scr">
      <div className="pad">
        <h1 className="tt">운영자 화면</h1>
        <nav className="admin-nav" aria-label="운영자 메뉴">
          <button type="button" onClick={() => token && load(token)}>
            🔄 새로고침
          </button>
          <Link href="/">🏠 메인</Link>
          <Link href="/notice">📌 안내·메모판</Link>
          <Link href="/glossary">📖 용어 풀이</Link>
        </nav>
        <p className="admin-hint">이 기기에는 운영자 열쇠가 저장돼 있어, 안내사항 화면 아래의 &lsquo;운영자 화면&rsquo; 링크로 언제든 돌아올 수 있습니다.</p>
        {error && <p className="help err">{error}</p>}
        {stats && (
          <>
            <p className="lbl" style={{ marginTop: 16 }}>이용 현황</p>
            <div className="admin-stats">
              <Stat label="접수 사건" value={`${stats.cases.today}`} note={`7일 ${stats.cases.week} · 전체 ${stats.cases.total}`} />
              <Stat label="항소" value={`${stats.appeals.total}`} note={`가중 ${stats.appeals.raised}`} />
              <Stat label="상고" value={`${stats.supremes.total}`} note={`가중 ${stats.supremes.raised}`} />
              <Stat
                label="맞고소 게임"
                value={`${stats.countersuits.played}`}
                note={`건너뜀 ${stats.countersuits.skipped} · 평균 ${stats.countersuits.averageHits ?? "-"}회 · 완벽 ${stats.countersuits.perfect}`}
              />
              <Stat label="피고 답변서" value={`${stats.responses.total}`} note={`응소 거부 ${stats.responses.declined}`} />
              <Stat label="배심원 평결" value={`${stats.jury.votes}`} note={`평결 받은 사건 ${stats.jury.cases}`} />
              <Stat label="아이디어" value={`${stats.ideas.pending}`} note={`대기 · 공개 ${stats.ideas.approved} · 비공개 ${stats.ideas.private}`} />
            </div>
            <p className="admin-hint">접수 사건의 큰 숫자는 오늘 건수입니다. 피고 답변서가 3건 이상이면 실제 피고 참여 단계의 착수 조건이 채워집니다.</p>
          </>
        )}
        <p className="lbl" style={{ marginTop: 22 }}>메모판</p>
        <p className="sub" style={{ marginTop: 0 }}>확인 대기 {waiting}장 · 전체 {ideas?.length ?? 0}장</p>
        <div className="stack" style={{ marginTop: 16 }}>
          {ideas?.map((idea) => (
            <div className="admin-idea" key={idea.id}>
              <span className="meta">
                #{idea.id} · {idea.nickname ?? "익명 시민"} · {STATUS_LABEL[idea.status]} · {new Date(idea.createdAt).toLocaleString("ko-KR")}
              </span>
              <p>{idea.text}</p>
              {idea.status !== "private" && (
                <div className="btn-row">
                  <button className="btn sm" type="button" disabled={idea.status === "approved"} onClick={() => review(idea.id, "approved")}>
                    공개하기
                  </button>
                  <button className="btn line sm" type="button" disabled={idea.status === "rejected"} onClick={() => review(idea.id, "rejected")}>
                    숨기기
                  </button>
                </div>
              )}
            </div>
          ))}
          {ideas?.length === 0 && <p className="sub">아직 붙은 메모가 없습니다.</p>}
        </div>
        <div className="grow" />
        <button className="btn line sm" type="button" style={{ marginTop: 22 }} onClick={forget}>
          이 기기에서 운영자 열쇠 지우기
        </button>
      </div>
    </div>
  );
}
