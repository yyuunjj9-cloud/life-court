"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Steps } from "@/components/Steps";
import { DraftSaveButton } from "@/components/DraftSaveButton";
import { useCaseStore } from "@/store/case-store";
import { fetchOffenses } from "@/lib/api";
import type { CaseType, Relationship } from "@/domain/judgment";

const TYPES: { key: CaseType; icon: string; label: string }[] = [
  { key: "work", icon: "💼", label: "회사생활" },
  { key: "relationship", icon: "👥", label: "인간관계" },
  { key: "meal", icon: "🍴", label: "식사" },
  { key: "messenger", icon: "💬", label: "메신저" },
  { key: "money", icon: "💸", label: "돈·정산" },
  { key: "romance", icon: "💘", label: "연애·썸" },
  { key: "daily", icon: "🏠", label: "일상" },
];

const RELS: { key: Relationship; label: string }[] = [
  { key: "self", label: "본인" },
  { key: "colleague", label: "동료" },
  { key: "friend", label: "친구" },
  { key: "family", label: "가족" },
  { key: "lover", label: "연인·썸" },
  { key: "neighbor", label: "이웃" },
  { key: "boss", label: "상사" },
  { key: "anonymous", label: "익명 인물" },
];

/* 03 사건 접수 — 유형/관계 선택 */
export default function TypePage() {
  const router = useRouter();
  const { draft, setCaseType, setRelationship } = useCaseStore();
  const ready = draft.caseType !== null && draft.relationship !== null;

  // 유형별 죄목 미리보기 — 장식용이라 실패하면 조용히 생략한다.
  const [offenses, setOffenses] = useState<Record<string, string[]> | null>(null);
  useEffect(() => {
    let active = true;
    fetchOffenses().then((data) => {
      if (active) setOffenses(data);
    });
    return () => {
      active = false;
    };
  }, []);
  // 두 개만 보여 줘야 긴 죄목이 겹쳐도 두 줄 안에 들어가 아래 영역이 밀리지 않는다.
  const crimeHint = useMemo(() => {
    const crimes = draft.caseType ? offenses?.[draft.caseType] : undefined;
    if (!crimes || crimes.length === 0) return null;
    const picks = [...crimes].sort(() => Math.random() - 0.5).slice(0, 2);
    return { picks, rest: crimes.length - picks.length };
  }, [draft.caseType, offenses]);

  const typeButton = (t: (typeof TYPES)[number]) => (
    <button
      key={t.key}
      className="ev"
      type="button"
      aria-pressed={draft.caseType === t.key}
      onClick={() => setCaseType(t.key)}
    >
      <span className="gl">{t.icon}</span>
      <span className="lb">{t.label}</span>
    </button>
  );

  return (
    <div className="scr">
      <div className="pad">
        <Steps current={2} />
        <p className="lbl">사건 유형</p>
        <div className="g3">{TYPES.slice(0, 3).map(typeButton)}</div>
        <div className="g4">{TYPES.slice(3).map(typeButton)}</div>
        {/* 고르기 전에도 같은 자리를 차지해, 카드를 누를 때 관계 선택과 버튼이 밀리지 않는다 */}
        <p className="crime-hint" aria-live="polite">
          {crimeHint ? (
            <>
              주요 죄목:{" "}
              {crimeHint.picks.map((crime, i) => (
                <span key={crime}>
                  {i > 0 && " · "}
                  <span className="crime">{crime}</span>
                </span>
              ))}
              {crimeHint.rest > 0 && <span className="crime"> 外 {crimeHint.rest}건</span>}
            </>
          ) : draft.caseType ? null : (
            "유형을 고르면 다루는 죄목을 미리 볼 수 있습니다."
          )}
        </p>
        <p className="lbl" style={{ marginTop: 24 }}>
          피고와의 관계
        </p>
        <div className="pills">
          {RELS.map((r) => (
            <button
              key={r.key}
              className="pill"
              type="button"
              aria-pressed={draft.relationship === r.key}
              onClick={() => setRelationship(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="grow" />
        <div className="stack">
          <div className="btn-row">
            <button className="btn line" type="button" onClick={() => router.push("/intake/story")}>
              이전
            </button>
            <button
              className="btn"
              type="button"
              style={{ flex: 2 }}
              disabled={!ready}
              onClick={() => router.push("/intake/tone")}
            >
              다음
            </button>
          </div>
          <DraftSaveButton />
        </div>
      </div>
    </div>
  );
}
