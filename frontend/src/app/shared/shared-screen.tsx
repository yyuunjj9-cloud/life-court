"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { SaveVerdictImage } from "@/components/SaveVerdictImage";
import { VerdictDoc } from "@/components/VerdictDoc";
import type { Verdict } from "@/domain/judgment";
import { api, ApiError } from "@/lib/api";
import type { ModerationIssue } from "@/domain/moderation";
import { IntakeRejection } from "@/components/IntakeRejection";
import { decodeSharedCase } from "@/lib/share";
import { useCaseStore } from "@/store/case-store";

/* 공유받은 판결문 — 링크의 사건 데이터로 원본과 동일한 판결을 재현한다. */
function SharedScreenInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { resetCase, setStory } = useCaseStore();

  const shared = useMemo(() => {
    const d = params.get("d");
    return d ? decodeSharedCase(d) : null;
  }, [params]);

  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [failed, setFailed] = useState(false);
  const [issue, setIssue] = useState<ModerationIssue | null>(null);

  useEffect(() => {
    if (!shared) return;
    let alive = true;
    api
      .previewVerdict(shared.input, shared.seq)
      .then(({ verdict }) => {
        if (alive) setVerdict(verdict);
      })
      .catch((error) => {
        if (!alive) return;
        if (error instanceof ApiError && error.issue) setIssue(error.issue);
        else setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [shared]);

  const startMine = () => {
    resetCase();
    router.push("/intake/story");
  };

  if (issue) return <div className="scr"><div className="pad">
    <IntakeRejection issue={issue} onEdit={() => {
      resetCase();
      if (shared) setStory(shared.input.story);
      router.push("/intake/story");
    }} />
  </div></div>;

  if (!shared || failed) {
    return (
      <div className="scr">
        <div className="pad">
          <h1 className="tt">사건 기록을 열 수 없습니다</h1>
          <p className="sub">
            {!shared ? "링크가 잘못되었거나 훼손되었습니다." : "법원 서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요."}
          </p>
          <div className="grow" />
          <button className="btn" type="button" onClick={startMine}>
            내 사건 접수하기
          </button>
        </div>
      </div>
    );
  }

  if (!verdict) {
    return (
      <div className="scr">
        <div className="pad">
          <h1 className="tt">사건 기록을 여는 중...</h1>
          <p className="sub">공유받은 판결문을 재현하고 있습니다. 잠시만 기다려주세요 🔨</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scr verdict-scr">
      <div className="pad">
        <p className="shared-label">📨 공유받은 판결문</p>
        <VerdictDoc verdict={verdict} />
        <div className="grow" />
        <div className="stack" style={{ marginTop: 14 }}>
          <button className="btn" type="button" onClick={startMine}>
            나도 사건 접수하기
          </button>
          <SaveVerdictImage verdict={verdict} />
        </div>
      </div>
    </div>
  );
}

export function SharedScreen() {
  return (
    <Suspense fallback={<div className="scr" />}>
      <SharedScreenInner />
    </Suspense>
  );
}
