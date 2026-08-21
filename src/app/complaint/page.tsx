"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ComplaintDocView } from "@/components/LegalDocs";
import { generateComplaint } from "@/domain/documents";
import { formatKoreanDate } from "@/domain/date";
import { useCaseStore } from "@/store/case-store";

/* 12 고소장 / 고발장 확인 */
export default function ComplaintPage() {
  const router = useRouter();
  const { draft, verdict, filingKind } = useCaseStore();
  const ready = verdict !== null && filingKind !== null && draft.caseType !== null && draft.relationship !== null;

  useEffect(() => {
    if (!ready) router.replace("/intake/story");
  }, [ready, router]);

  if (!ready || !verdict || !filingKind || !draft.caseType || !draft.relationship) return <div className="scr" />;

  const doc = generateComplaint(
    { story: draft.story, caseType: draft.caseType, relationship: draft.relationship, severity: draft.severity, tone: draft.tone },
    verdict,
    filingKind,
  );

  return (
    <div className="scr">
      <div className="pad">
        <ComplaintDocView doc={doc} date={formatKoreanDate(new Date())} />
        <div className="grow" />
        <div className="stack" style={{ marginTop: 14 }}>
          <button className="btn" type="button" onClick={() => router.push("/trial")}>
            이대로 접수하고 심리 시작
          </button>
          <div className="btn-row">
            <Link className="btn sm" href="/save?doc=complaint">
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
