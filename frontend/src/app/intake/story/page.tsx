"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Steps } from "@/components/Steps";
import { DraftSaveButton } from "@/components/DraftSaveButton";
import { useCaseStore } from "@/store/case-store";
import { api } from "@/lib/api";
import type { ModerationIssue } from "@/domain/moderation";
import { IntakeRejection } from "@/components/IntakeRejection";
import { exampleDay, isExampleStory, pickExamples } from "@/domain/examples";

const MIN = 10;
const MAX = 300;

/* 02 사건 접수 — 내용 입력 */
export default function StoryPage() {
  const router = useRouter();
  const { draft, setStory } = useCaseStore();
  const [touched, setTouched] = useState(false);
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);
  const [issue, setIssue] = useState<ModerationIssue | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const len = draft.story.trim().length;
  const invalid = len < MIN || len > MAX;
  const ownStory = len > 0 && !isExampleStory(draft.story);

  // 첫 방문자의 빈 화면 공포를 줄이는 예시 — 하루에 한 번 바뀌고, 버튼으로 다른 묶음을 볼 수 있다.
  const [day] = useState(exampleDay);
  const [round, setRound] = useState(0);
  const examples = useMemo(() => {
    const picked = pickExamples(day, round);
    // 골라 둔 예시가 다른 묶음으로 넘어가도 계속 보이게 둔다.
    return isExampleStory(draft.story) && !picked.includes(draft.story) ? [...picked.slice(0, -1), draft.story] : picked;
  }, [day, round, draft.story]);

  const next = async () => {
    if (checking) return;
    setTouched(true);
    if (invalid) {
      setShake(true);
      taRef.current?.focus();
      return;
    }
    setChecking(true);
    setCheckFailed(false);
    try {
      const result = await api.checkStory(draft.story);
      setIssue(result.issue);
      if (!result.issue) router.push("/intake/type");
    } catch { setCheckFailed(true); }
    finally { setChecking(false); }
  };

  return (
    <div className="scr">
      <div className="pad">
        <Steps current={1} />
        <h1 className="tt">사건 내용을 진술하시오</h1>
        <p className="sub">여러분의 사소한 사건을 들려주세요.</p>
        <div className={shake ? "field shake" : "field"} onAnimationEnd={() => setShake(false)}>
          <textarea
            ref={taRef}
            value={draft.story}
            maxLength={MAX}
            onChange={(e) => { setStory(e.target.value); setIssue(null); setCheckFailed(false); }}
            readOnly={checking}
            aria-invalid={!!issue || (touched && invalid)}
            placeholder={"예: 회의 시작 2분 전에\n자료 검토를 요청받았습니다."}
            aria-label="사건 내용"
          />
          <div className="count">
            {draft.story.length} / {MAX}
          </div>
        </div>
        {issue && <IntakeRejection issue={issue} onEdit={() => { setIssue(null); taRef.current?.focus(); }} />}
        {checkFailed && <p className="help" role="alert">지금은 진술을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.</p>}
        <div className={touched && invalid ? "help warn" : "help"}>
          {touched && invalid
            ? `재판부가 심리할 내용이 부족합니다. 사연을 조금만 더 들려주세요. (${MIN}자 이상)`
            : `${MIN}~${MAX}자 이내로 입력해주세요.`}
        </div>
        {/* 예시는 늘 같은 자리에 둔다 — 고르는 순간 목록이 사라지면 화면 아래가 통째로 바뀐다.
            직접 쓴 진술이 있으면 덮어쓰지 않도록 예시를 잠근다. */}
        <div className={ownStory ? "examples locked" : "examples"}>
          <p className="lbl">{ownStory ? "직접 쓴 진술로 심리합니다" : "이런 사건은 어떠신가요?"}</p>
          {examples.map((ex) => (
            <button
              className="example-chip"
              key={ex}
              type="button"
              aria-pressed={draft.story === ex}
              disabled={ownStory}
              onClick={() => {
                setStory(ex);
                setIssue(null);
                setCheckFailed(false);
              }}
            >
              {ex}
            </button>
          ))}
          <div className="examples-foot">
            <span>예시는 실제 접수된 사연이 아닌 가상의 예문입니다.</span>
            <button type="button" className="examples-more" disabled={ownStory} onClick={() => setRound((r) => r + 1)}>
              🔄 다른 예시
            </button>
          </div>
        </div>
        <div className="grow" />
        <div className="stack">
          <div className="btn-row">
            <button className="btn line" type="button" onClick={() => router.push("/")}>
              이전
            </button>
            <button className="btn" type="button" style={{ flex: 2 }} onClick={next} disabled={checking}>
              {checking ? "진술 확인 중..." : "다음"}
            </button>
          </div>
          <DraftSaveButton />
        </div>
      </div>
    </div>
  );
}
