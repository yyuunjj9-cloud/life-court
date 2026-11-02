"use client";

import { useState } from "react";
import { DECLINE_CHOICE, DEFENSE_CHOICES, type DefenseResponseDoc } from "@/domain/response";
import { api } from "@/lib/api";

/**
 * 피고 측 답변서 섹션 — 공유 판결문(/s/…) 하단에 붙는다.
 * 1단계: 선택지로만 응답(자유 텍스트 없음), 사건당 1회, 응소 거부 가능.
 */
export function DefenseSection({
  seq,
  token,
  initial,
}: {
  seq: number;
  token: string;
  initial: DefenseResponseDoc | null;
}) {
  const [doc, setDoc] = useState<DefenseResponseDoc | null>(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (option: string) => {
    if (pending || doc) return;
    setPending(option);
    setError(null);
    try {
      const { responseDoc } = await api.submitDefense(seq, token, option);
      setDoc(responseDoc);
    } catch (e) {
      if (e instanceof Error && e.message.includes("409")) {
        setError("이미 다른 답변이 접수된 사건입니다. 새로고침하면 접수된 답변을 볼 수 있습니다.");
      } else {
        setError("답변서 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setPending(null);
      setConfirmDecline(false);
    }
  };

  if (doc) {
    return (
      <div className="resp">
        <p className="lbl">피고 측 답변서</p>
        <div className="resp-doc">
          <p className="k">답 변 요 지</p>
          <p className="t">{doc.statement}</p>
          <div className="ruling">
            <p className="k">재 판 부 결 정</p>
            <p className="t">{doc.ruling}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="resp">
      <p className="lbl">이의 있음!</p>
      <p className="resp-intro">
        이 판결의 피고 당사자이신가요? 아래 선택지 중 하나로 답변서를 제출할 수 있습니다.
        <br />
        답변은 선택지로만 가능하며, 사건당 한 번만 접수됩니다.
      </p>
      <div className="resp-opts">
        {DEFENSE_CHOICES.map((c) => (
          <button
            key={c.id}
            className="resp-opt"
            type="button"
            disabled={pending !== null}
            onClick={() => submit(c.id)}
          >
            {pending === c.id ? "답변서 접수 중..." : c.label}
          </button>
        ))}
      </div>
      {confirmDecline ? (
        <button
          className="resp-decline confirm"
          type="button"
          disabled={pending !== null}
          onClick={() => submit(DECLINE_CHOICE.id)}
        >
          {pending === DECLINE_CHOICE.id
            ? "사건 종결 중..."
            : "한 번 더 누르면 응소 거부가 확정되고 사건이 종결됩니다"}
        </button>
      ) : (
        <button className="resp-decline" type="button" disabled={pending !== null} onClick={() => setConfirmDecline(true)}>
          {DECLINE_CHOICE.label}
        </button>
      )}
      {error && <div className="help err">{error}</div>}
      <p className="resp-fine">
        본 답변서는 오락 목적의 가상 문서로 실제 법적 효력이 없으며, 재판부 결정은 원심 판결을 변경하지 않습니다.
      </p>
    </div>
  );
}
