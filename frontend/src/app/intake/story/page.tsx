"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Steps } from "@/components/Steps";
import { DraftSaveButton } from "@/components/DraftSaveButton";
import { useCaseStore } from "@/store/case-store";

const MIN = 10;
const MAX = 300;

/* 02 사건 접수 — 내용 입력 */
export default function StoryPage() {
  const router = useRouter();
  const { draft, setStory } = useCaseStore();
  const [touched, setTouched] = useState(false);

  const len = draft.story.trim().length;
  const invalid = len < MIN || len > MAX;

  const next = () => {
    setTouched(true);
    if (!invalid) router.push("/intake/type");
  };

  return (
    <div className="scr">
      <div className="pad">
        <Steps current={1} />
        <h1 className="tt">사건 내용을 진술하시오</h1>
        <p className="sub">여러분의 사소한 사건을 들려주세요.</p>
        <div className="field">
          <textarea
            value={draft.story}
            maxLength={MAX}
            onChange={(e) => setStory(e.target.value)}
            placeholder={"예: 회의 시작 2분 전에\n자료 검토를 요청받았습니다."}
            aria-label="사건 내용"
          />
          <div className="count">
            {draft.story.length} / {MAX}
          </div>
        </div>
        <div className={touched && invalid ? "help err" : "help"}>
          {touched && invalid ? `${MIN}자 이상 입력해야 접수할 수 있습니다.` : `${MIN}~${MAX}자 이내로 입력해주세요.`}
        </div>
        <div className="grow" />
        <div className="stack">
          <button className="btn" type="button" onClick={next}>
            다음
          </button>
          <DraftSaveButton />
        </div>
      </div>
    </div>
  );
}
