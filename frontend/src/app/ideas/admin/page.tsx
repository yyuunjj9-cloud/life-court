"use client";

import { useCallback, useEffect, useState } from "react";
import { ideasApi, type AdminIdea } from "@/lib/api";

const TOKEN_KEY = "lifecourt.adminToken";

const STATUS_LABEL: Record<AdminIdea["status"], string> = {
  pending: "공개 요청 · 확인 대기",
  approved: "공개 중",
  rejected: "숨김",
  private: "운영자에게만",
};

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
      setIdeas((await ideasApi.adminList(key)).ideas);
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
          <h1 className="tt">메모판 운영</h1>
          <p className="sub">운영자 열쇠가 담긴 주소로 들어와야 합니다.</p>
        </div>
      </div>
    );
  }

  const waiting = ideas?.filter((i) => i.status === "pending").length ?? 0;

  return (
    <div className="scr">
      <div className="pad">
        <h1 className="tt">메모판 운영</h1>
        <p className="sub">확인 대기 {waiting}장 · 전체 {ideas?.length ?? 0}장</p>
        {error && <p className="help err">{error}</p>}
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
      </div>
    </div>
  );
}
