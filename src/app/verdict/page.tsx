"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { VerdictDoc } from "@/components/VerdictDoc";
import { useCaseStore } from "@/store/case-store";

/* 06 판결 결과 */
export default function VerdictPage() {
  const router = useRouter();
  const { verdict, fileAppeal } = useCaseStore();

  useEffect(() => {
    // 접수 없이 직접 진입한 경우
    if (!verdict) router.replace("/");
  }, [verdict, router]);

  if (!verdict) return <div className="scr" />;

  const appeal = () => {
    fileAppeal();
    router.push("/appeal");
  };

  return (
    <div className="scr">
      <div className="verdict-flash">
        <div className="burst">판결 선고!</div>
      </div>
      <div className="pad">
        <VerdictDoc verdict={verdict} />
        <div className="grow" />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn dark sm" type="button" onClick={appeal}>
            항소하기
          </button>
          <Link className="btn sm" href="/save">
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
