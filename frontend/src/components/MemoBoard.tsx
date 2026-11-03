"use client";

import { useEffect, useState } from "react";
import { ApiError, fetchIdeas, ideasApi, type PublicIdea } from "@/lib/api";

/** 재판부가 검토 중인 다음 개정 아이디어 — 운영자가 코드로 관리한다. */
const ROADMAP: { keyword: string; detail: string }[] = [
  { keyword: "쌍방 소통", detail: "피고도 링크로 들어와 함께 겨루기" },
  { keyword: "벌칙 선택지", detail: "준비된 벌칙 중 원고가 직접 고르기" },
  { keyword: "벌칙 직접 입력", detail: "원고가 벌칙을 직접 쓰기 (금칙어 검사)" },
  { keyword: "실제 맞고소", detail: "가상 연출이 아닌 진짜 피고의 맞고소" },
  { keyword: "피고 항소", detail: "피고도 판결에 불복해 항소하기" },
];

const MAX = 60;

/* 안내 페이지 — 업데이트 예정 메모판. 이용자 아이디어는 운영자가 승인한 것만 붙는다. */
export function MemoBoard() {
  const [ideas, setIdeas] = useState<PublicIdea[]>([]);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchIdeas().then((list) => {
      if (alive && list) setIdeas(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const submit = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 2 || sending) return;
    setSending(true);
    setResult(null);
    try {
      const { status } = await ideasApi.submit(trimmed, isPublic);
      setText("");
      setResult(status === "pending" ? "붙였습니다. 운영자가 확인한 뒤 메모판에 공개됩니다." : "운영자에게만 전달했습니다. 고맙습니다.");
    } catch (error) {
      setResult(
        error instanceof ApiError && error.issue
          ? `메모를 붙일 수 없습니다. ${error.issue.message}`
          : error instanceof ApiError && error.status === 429
            ? "잠시 뒤에 다시 붙여 주세요. 메모가 너무 빨리 쌓이고 있습니다."
            : "지금은 메모를 붙이지 못했습니다. 잠시 뒤에 다시 시도해 주세요.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="memo-board" aria-labelledby="memo-title">
      <div className="memo-head">
        <h2 id="memo-title">업데이트 예정 메모</h2>
        <button className="memo-pencil" type="button" aria-expanded={writing} onClick={() => setWriting((w) => !w)}>
          ✏️ 아이디어 붙이기
        </button>
      </div>
      <div className="memo-grid">
        {ROADMAP.map((m, i) => (
          <div className={`memo m${i % 3}`} key={m.keyword}>
            <b>{m.keyword}</b>
            <span>{m.detail}</span>
          </div>
        ))}
        {ideas.map((idea) => (
          <div className="memo user" key={idea.id}>
            <span className="memo-tag">이용자 아이디어</span>
            <span>{idea.text}</span>
          </div>
        ))}
      </div>
      {writing && (
        <div className="memo-form">
          <textarea
            value={text}
            maxLength={MAX}
            rows={2}
            placeholder="이런 기능이 있으면 좋겠어요 (개인정보는 적지 마세요)"
            aria-label="아이디어"
            onChange={(e) => {
              setText(e.target.value);
              setResult(null);
            }}
          />
          <div className="memo-options" role="group" aria-label="공개 여부">
            <button type="button" className="pill" aria-pressed={isPublic} onClick={() => setIsPublic(true)}>
              공개 요청
            </button>
            <button type="button" className="pill" aria-pressed={!isPublic} onClick={() => setIsPublic(false)}>
              운영자에게만
            </button>
            <span className="memo-count">
              {text.length} / {MAX}
            </span>
          </div>
          <p className="memo-help">
            {isPublic ? "공개 요청한 메모는 운영자가 확인한 뒤에만 메모판에 붙습니다." : "운영자만 읽고 메모판에는 붙지 않습니다."}
          </p>
          <button className="btn sm" type="button" disabled={text.trim().length < 2 || sending} onClick={submit}>
            {sending ? "붙이는 중..." : "메모 붙이기"}
          </button>
        </div>
      )}
      {result && (
        <p className="memo-result" role="status">
          {result}
        </p>
      )}
    </section>
  );
}
