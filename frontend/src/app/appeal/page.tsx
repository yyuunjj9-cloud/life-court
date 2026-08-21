"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppealDoc } from "@/components/VerdictDoc";
import { formatKoreanDate } from "@/domain/date";
import { useCaseStore } from "@/store/case-store";

/* 07 항소 결과 */
export default function AppealPage() {
  const router = useRouter();
  const { verdict, appeal, fileAppeal } = useCaseStore();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!verdict) {
      router.replace("/");
      return;
    }
    // 항소 없이 직접 진입한 경우 즉석에서 항소심을 연다.
    if (!appeal) {
      fileAppeal().then((ok) => {
        if (!ok) setError(true);
      });
    }
  }, [verdict, appeal, fileAppeal, router]);

  if (!verdict) return <div className="scr" />;

  if (!appeal) {
    return (
      <div className="scr">
        <div className="pad">
          <h1 className="tt">항소심 진행 중...</h1>
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
      <div className="pad">
        <AppealDoc verdict={verdict} appeal={appeal} date={formatKoreanDate(new Date())} />
        <div className="grow" />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <Link className="btn sm" href="/save?doc=appeal">
            판결문 저장
          </Link>
          <Link className="btn dark sm" href="/received">
            새 사건 접수
          </Link>
        </div>
      </div>
    </div>
  );
}
