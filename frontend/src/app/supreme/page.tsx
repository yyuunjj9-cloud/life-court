"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SupremeDoc } from "@/components/VerdictDoc";
import { Burst } from "@/components/Burst";
import { formatKoreanDate } from "@/domain/date";
import { useCaseStore } from "@/store/case-store";

/* 07-2 대법원 상고 결과 — 항소심 화면에서 원고가 상고를 고른 경우에만 온다. */
export default function SupremePage() {
  const router = useRouter();
  const { verdict, appeal, supreme, fileSupreme, hydrated } = useCaseStore();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    // 항소심 없이 들어오면 상고할 수 없으므로 항소 화면으로 돌려보낸다.
    if (!verdict || !appeal) {
      router.replace(verdict ? "/appeal" : "/");
      return;
    }
    if (!supreme) {
      fileSupreme().then((ok) => {
        if (!ok) setError(true);
      });
    }
  }, [verdict, appeal, supreme, fileSupreme, router, hydrated]);

  if (!verdict || !appeal) return <div className="scr" />;

  if (!supreme) {
    return (
      <div className="scr">
        <div className="pad">
          <h1 className="tt">생활대법원 심리 중...</h1>
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
          <Burst
            text={supreme.overturned ? "Sustained!" : "Overruled!"}
            width={300}
            variant={supreme.overturned ? "sustained" : "overruled"}
            label={supreme.overturned ? "원고 상고 인용, 판결 확정" : "상고 기각, 판결 확정"}
          />
        </div>
      </div>
      <div className="pad">
        <SupremeDoc verdict={verdict} supreme={supreme} date={formatKoreanDate(new Date())} />
        <div className="grow" />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <Link className="btn sm" href="/save?doc=supreme">
            판결문 저장
          </Link>
          <Link className="btn dark sm" href="/appeal">
            항소심 판결문
          </Link>
          <Link className="btn dark sm" href="/received">
            새 사건 접수
          </Link>
        </div>
      </div>
    </div>
  );
}
