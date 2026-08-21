"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DemandDocView } from "@/components/LegalDocs";
import { generateDemandLetter } from "@/domain/documents";
import { formatKoreanDate } from "@/domain/date";
import { useCaseStore } from "@/store/case-store";

/* 13 내용증명 — 재판 전 경고장 */
export default function DemandPage() {
  const router = useRouter();
  const { draft, submitCase } = useCaseStore();
  const incomplete = !draft.caseType || !draft.relationship || draft.story.trim().length < 10;

  useEffect(() => {
    if (incomplete) router.replace("/intake/story");
  }, [incomplete, router]);

  if (incomplete || !draft.caseType || !draft.relationship) return <div className="scr" />;

  const doc = generateDemandLetter({
    story: draft.story,
    caseType: draft.caseType,
    relationship: draft.relationship,
    severity: draft.severity,
    tone: draft.tone,
  });

  // 수신인이 회신할 리 없으므로, 바로 정식 고소로 전환하는 길을 열어 둔다.
  const escalate = () => {
    submitCase("complaint");
    router.push("/trial");
  };

  return (
    <div className="scr">
      <div className="pad">
        <DemandDocView doc={doc} date={formatKoreanDate(new Date())} />
        <div className="grow" />
        <div className="stack" style={{ marginTop: 14 }}>
          <button className="btn dark" type="button" onClick={escalate}>
            …3일이 지나도 회신이 없다 (재판 진행)
          </button>
          <div className="btn-row">
            <Link className="btn sm" href="/save?doc=demand">
              문서 저장
            </Link>
            <Link className="btn line sm" href="/intake/filing">
              접수 방식 다시 선택
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
