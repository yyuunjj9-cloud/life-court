"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CountersuitDocView } from "@/components/LegalDocs";
import { generateCountersuit } from "@/domain/documents";
import { formatKoreanDate } from "@/domain/date";
import { useCaseStore } from "@/store/case-store";

/* 14 맞고소 — 피고의 역습 */
export default function CountersuitPage() {
  const router = useRouter();
  const { draft, verdict } = useCaseStore();
  const ready = verdict !== null && draft.caseType !== null && draft.relationship !== null;

  useEffect(() => {
    if (!ready) router.replace("/");
  }, [ready, router]);

  if (!ready || !verdict || !draft.caseType || !draft.relationship) return <div className="scr" />;

  const doc = generateCountersuit(
    { story: draft.story, caseType: draft.caseType, relationship: draft.relationship, severity: draft.severity, tone: draft.tone },
    verdict,
  );

  return (
    <div className="scr">
      <div className="verdict-flash">
        <div className="burst">맞고소?!</div>
      </div>
      <div className="pad">
        <CountersuitDocView doc={doc} date={formatKoreanDate(new Date())} />
        <div className="grow" />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <Link className="btn sm" href="/save?doc=countersuit">
            문서 저장
          </Link>
          <Link className="btn dark sm" href="/verdict">
            판결문으로
          </Link>
          <Link className="btn dark sm" href="/received">
            새 사건 접수
          </Link>
        </div>
      </div>
    </div>
  );
}
