"use client";

import { useRouter } from "next/navigation";
import { Steps } from "@/components/Steps";
import { DraftSaveButton } from "@/components/DraftSaveButton";
import { useCaseStore } from "@/store/case-store";
import type { Severity, Tone } from "@/domain/judgment";

const SEVERITIES: { value: Severity; num: string; caption: string }[] = [
  { value: 1, num: "一", caption: "사소함" },
  { value: 2, num: "二", caption: "약간\n괘씸함" },
  { value: 3, num: "三", caption: "정식\n심리 필요" },
  { value: 4, num: "四", caption: "중대\n사건" },
  { value: 5, num: "五", caption: "국가적\n위기" },
];

const TONES: { key: Tone; icon: string; label: string }[] = [
  { key: "lenient", icon: "🕊️", label: "관대함" },
  { key: "fair", icon: "⚖️", label: "공정함" },
  { key: "strict", icon: "🔨", label: "엄벌주의" },
];

/* 04 사건 접수 — 심각성/성향 선택 */
export default function TonePage() {
  const router = useRouter();
  const { draft, setSeverity, setTone } = useCaseStore();

  const submit = () => {
    if (!draft.caseType || !draft.relationship || draft.story.trim().length < 10) {
      router.replace("/intake/story");
      return;
    }
    router.push("/intake/filing");
  };

  return (
    <div className="scr">
      <div className="pad">
        <Steps current={4} />
        <p className="lbl">사건의 심각성</p>
        <div className="sev">
          {SEVERITIES.map((s) => (
            <button
              key={s.value}
              className="sv"
              type="button"
              aria-pressed={draft.severity === s.value}
              onClick={() => setSeverity(s.value)}
            >
              <span className="num">{s.num}</span>
              <span className="cp">{s.caption}</span>
            </button>
          ))}
        </div>
        <p className="lbl" style={{ marginTop: 26 }}>
          원하는 판결 성향
        </p>
        <div className="g3">
          {TONES.map((t) => (
            <button
              key={t.key}
              className="ev"
              type="button"
              aria-pressed={draft.tone === t.key}
              onClick={() => setTone(t.key)}
            >
              <span className="gl">{t.icon}</span>
              <span className="lb">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="grow" />
        <div className="stack">
          <div className="btn-row">
            <button className="btn line" type="button" onClick={() => router.push("/intake/scenario")}>
              이전
            </button>
            <button className="btn" type="button" style={{ flex: 2 }} onClick={submit}>
              다음 — 대응 방식
            </button>
          </div>
          <DraftSaveButton />
        </div>
      </div>
    </div>
  );
}
