"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Steps } from "@/components/Steps";
import { DraftSaveButton } from "@/components/DraftSaveButton";
import { IntakeRejection } from "@/components/IntakeRejection";
import { useCaseStore } from "@/store/case-store";
import { api, ApiError, type ScenarioChoices } from "@/lib/api";
import { GENERAL_CHOICE } from "@/domain/judgment";
import type { ModerationIssue } from "@/domain/moderation";

/* 03 사건 특정 — 재판부가 본 사건을 이용자가 한 번 확인한다(docs/plan-accuracy.md 2단계). */
export default function ScenarioPage() {
  const router = useRouter();
  const { draft, hydrated, setScenario } = useCaseStore();
  const [choices, setChoices] = useState<ScenarioChoices | null>(null);
  const [issue, setIssue] = useState<ModerationIssue | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!draft.caseType || draft.story.trim().length < 10) {
      router.replace("/intake/story");
      return;
    }
    let active = true;
    api.scenarioChoices(draft.story, draft.caseType).then(
      (result) => active && setChoices(result),
      (e) => {
        if (!active) return;
        if (e instanceof ApiError && e.issue) setIssue(e.issue);
        else setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [hydrated, draft.story, draft.caseType, router]);

  const choose = (scenario: string) => {
    setScenario(scenario);
    router.push("/intake/tone");
  };

  const pick = choices?.pick;

  return (
    <div className="scr">
      <div className="pad">
        <Steps current={3} />
        <h1 className="tt">사건을 특정합니다</h1>
        <p className="sub">재판부가 사연을 읽고 아래 사건으로 보았습니다. 맞는지 확인해 주세요.</p>

        {/* 응답 전에도 같은 높이를 차지해, 결과가 들어올 때 아래 버튼이 밀리지 않는다 */}
        <div className="scn-pick" aria-live="polite">
          {pick ? (
            <>
              <span className="scn-kicker">{pick.general ? "구체적 행위를 특정하기 어려움" : "재판부의 판단"}</span>
              <span className="scn-name">{pick.name}</span>
              <span className="scn-crime">{pick.crime}</span>
            </>
          ) : (
            <span className="scn-wait">{failed ? "법원 서버와 연결할 수 없어 사건을 미리 보여 드리지 못했습니다." : "재판부가 기록을 검토하고 있습니다…"}</span>
          )}
        </div>

        {pick && (
          <button className="btn" type="button" style={{ marginTop: 14 }} onClick={() => choose(pick.general ? GENERAL_CHOICE : pick.name)}>
            {pick.general ? "일반 분쟁으로 심리" : "맞습니다, 이대로 심리"}
          </button>
        )}
        {failed && (
          <button className="btn" type="button" style={{ marginTop: 14 }} onClick={() => router.push("/intake/tone")}>
            재판부 판단에 맡기고 다음
          </button>
        )}
        {issue && <IntakeRejection issue={issue} onEdit={() => router.push("/intake/story")} />}

        {choices && (
          <>
            <p className="lbl" style={{ marginTop: 26 }}>
              {pick?.general ? "혹시 이 사건인가요" : "다른 사건인가요"}
            </p>
            <div className="stack">
              {choices.alternatives.map((alt) => (
                <button key={alt.name} className="filing-opt" type="button" onClick={() => choose(alt.name)}>
                  <span className="fx">
                    <span className="fn">{alt.name}</span>
                    <span className="fd">{alt.crime}</span>
                  </span>
                  <span className="fa">›</span>
                </button>
              ))}
              {!pick?.general && (
                <button className="filing-opt" type="button" onClick={() => choose(GENERAL_CHOICE)}>
                  <span className="fx">
                    <span className="fn">해당 없음</span>
                    <span className="fd">구체적 죄명 없이 일반 분쟁으로 심리합니다</span>
                  </span>
                  <span className="fa">›</span>
                </button>
              )}
            </div>
          </>
        )}

        <div className="grow" />
        <div className="stack">
          <button className="btn line" type="button" onClick={() => router.push("/intake/type")}>
            이전
          </button>
          <DraftSaveButton />
        </div>
      </div>
    </div>
  );
}
