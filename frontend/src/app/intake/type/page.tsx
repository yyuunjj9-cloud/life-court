"use client";

import { useRouter } from "next/navigation";
import { Steps } from "@/components/Steps";
import { DraftSaveButton } from "@/components/DraftSaveButton";
import { useCaseStore } from "@/store/case-store";
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
        <div className="g3 two">{TYPES.slice(3, 5).map(typeButton)}</div>
        <div className="g3 two">{TYPES.slice(5).map(typeButton)}</div>
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
