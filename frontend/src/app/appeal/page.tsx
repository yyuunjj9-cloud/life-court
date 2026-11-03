"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppealDoc } from "@/components/VerdictDoc";
import { Burst } from "@/components/Burst";
import { formatKoreanDate } from "@/domain/date";
import { useCaseStore } from "@/store/case-store";

/* 07 항소 결과 */
export default function AppealPage() {
  const router = useRouter();
  const { verdict, appeal, supreme, fileAppeal, hydrated } = useCaseStore();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
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
  }, [verdict, appeal, fileAppeal, router, hydrated]);

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
      <div className="verdict-flash">
        <div className="burst-wrap">
          <Burst text={appeal.overturned ? "Sustained!" : "Overruled!"} width={300} variant={appeal.overturned ? "sustained" : "overruled"} />
        </div>
      </div>
      <div className="pad">
        <AppealDoc verdict={verdict} appeal={appeal} date={formatKoreanDate(new Date())} />
        {/* 상고는 선택이다 — 누르지 않으면 항소심 판결로 끝난다. */}
        <div className="supreme-offer">
          {supreme ? (
            <Link className="btn dark sm" href="/supreme">
              상고심 판결문 보기 ({supreme.finalResult} 확정)
            </Link>
          ) : (
            <>
              <p className="supreme-note">
                아직 억울하다면 생활대법원에 한 번 더 다툴 수 있습니다.
                <br />
                상고하지 않으면 항소심 판결로 사건이 끝납니다.
              </p>
              <Link className="btn line sm" href="/supreme">
                대법원에 상고하기
              </Link>
            </>
          )}
        </div>
        <div className="grow" />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <Link className="btn sm" href="/save?doc=appeal">
            판결문 저장
          </Link>
          <Link className="btn dark sm" href="/verdict">
            원심 판결문
          </Link>
          <Link className="btn dark sm" href="/received">
            새 사건 접수
          </Link>
        </div>
      </div>
    </div>
  );
}
