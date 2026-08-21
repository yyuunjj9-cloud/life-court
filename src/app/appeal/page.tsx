"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppealDoc } from "@/components/VerdictDoc";
import { formatKoreanDate } from "@/domain/date";
import { useCaseStore } from "@/store/case-store";

/* 07 항소 결과 */
export default function AppealPage() {
  const router = useRouter();
  const { verdict, appeal, fileAppeal } = useCaseStore();

  useEffect(() => {
    if (!verdict) {
      router.replace("/");
      return;
    }
    // 항소 없이 직접 진입한 경우 즉석에서 항소심을 연다.
    if (!appeal) fileAppeal();
  }, [verdict, appeal, fileAppeal, router]);

  if (!verdict || !appeal) return <div className="scr" />;

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
