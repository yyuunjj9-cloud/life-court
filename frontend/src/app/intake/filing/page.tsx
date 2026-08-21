"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Steps } from "@/components/Steps";
import { useCaseStore } from "@/store/case-store";
import type { FilingKind } from "@/domain/documents";

const OPTIONS: { kind: FilingKind | "demand"; icon: string; name: string; desc: string }[] = [
  { kind: "complaint", icon: "📜", name: "고소장 접수", desc: "피해자 본인으로서 정식 고소합니다." },
  { kind: "accusation", icon: "🕵️", name: "고발장 접수", desc: "정의로운 제3자로서 고발합니다." },
  { kind: "demand", icon: "📮", name: "내용증명 발송", desc: "재판 전, 엄중한 경고장부터 보냅니다." },
];

/* 11 접수 방식 선택 — 고소 / 고발 / 내용증명 */
export default function FilingPage() {
  const router = useRouter();
  const { draft, submitCase, createDemand } = useCaseStore();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const incomplete = !draft.caseType || !draft.relationship || draft.story.trim().length < 10;

  useEffect(() => {
    if (incomplete) router.replace("/intake/story");
  }, [incomplete, router]);

  if (incomplete) return <div className="scr" />;

  const choose = async (kind: FilingKind | "demand") => {
    if (pending) return;
    setPending(kind);
    setError(false);
    const ok = kind === "demand" ? await createDemand() : await submitCase(kind);
    if (!ok) {
      setError(true);
      setPending(null);
      return;
    }
    router.push(kind === "demand" ? "/demand" : "/complaint");
  };

  return (
    <div className="scr">
      <div className="pad">
        <Steps current={5} />
        <h1 className="tt">대응 방식을 선택하시오</h1>
        <p className="sub">같은 사건이라도 서류의 격이 다릅니다.</p>
        <div className="stack" style={{ marginTop: 18 }}>
          {OPTIONS.map((o) => (
            <button
              key={o.kind}
              className="filing-opt"
              type="button"
              disabled={pending !== null}
              onClick={() => choose(o.kind)}
            >
              <span className="fi">{o.icon}</span>
              <span className="fx">
                <span className="fn">{pending === o.kind ? "접수 중..." : o.name}</span>
                <span className="fd">{o.desc}</span>
              </span>
              <span className="fa">›</span>
            </button>
          ))}
        </div>
        {error && <div className="help err">법원 서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.</div>}
        <div className="grow" />
        <p className="sub">모든 문서는 오락용 가상 문서이며 실제 법적 효력이 없습니다.</p>
      </div>
    </div>
  );
}
