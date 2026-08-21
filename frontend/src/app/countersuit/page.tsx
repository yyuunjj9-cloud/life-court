"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CountersuitDocView } from "@/components/LegalDocs";
import { formatKoreanDate } from "@/domain/date";
import { useCaseStore } from "@/store/case-store";

/* 14 맞고소 — 피고의 역습 */
export default function CountersuitPage() {
  const router = useRouter();
  const { caseSeq, countersuit, fileCountersuit } = useCaseStore();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (caseSeq === null) {
      router.replace("/");
      return;
    }
    if (!countersuit) {
      fileCountersuit().then((ok) => {
        if (!ok) setError(true);
      });
    }
  }, [caseSeq, countersuit, fileCountersuit, router]);

  if (caseSeq === null) return <div className="scr" />;

  if (!countersuit) {
    return (
      <div className="scr">
        <div className="pad">
          <h1 className="tt">맞고소장 접수 확인 중...</h1>
          {error && (
            <p className="sub" style={{ color: "var(--objection-red)" }}>
              법원 서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="scr">
      <div className="verdict-flash">
        <div className="burst">맞고소?!</div>
      </div>
      <div className="pad">
        <CountersuitDocView doc={countersuit} date={formatKoreanDate(new Date())} />
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
