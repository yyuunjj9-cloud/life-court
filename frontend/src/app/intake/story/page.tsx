"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Steps } from "@/components/Steps";
import { DraftSaveButton } from "@/components/DraftSaveButton";
import { useCaseStore } from "@/store/case-store";
import { api } from "@/lib/api";
import type { ModerationIssue } from "@/domain/moderation";
import { IntakeRejection } from "@/components/IntakeRejection";

const MIN = 10;
const MAX = 300;

/** 첫 방문자의 빈 화면 공포를 줄이는 예시 사연 — 탭하면 입력란에 채워진다. */
const EXAMPLES = [
  "팀장님이 회의 시작 2분 전에 자료 검토를 요청했어요. 심지어 본인은 회의에 늦게 들어왔습니다.",
  "친구가 약속에 40분 늦고는 사과도 없이 배고프다며 메뉴부터 골랐어요.",
  "룸메가 문을 쾅 닫고는 자기가 안 그랬고 바람이 그런 거라고 우깁니다.",
  "단체방에서 내 말만 읽씹하면서 스토리는 꼬박꼬박 올라옵니다.",
];

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
        {draft.story.trim().length === 0 && (
          <div className="examples">
            <p className="lbl">이런 사건은 어떠신가요?</p>
            {EXAMPLES.map((ex) => (
              <button className="example-chip" key={ex} type="button" onClick={() => setStory(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}
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
