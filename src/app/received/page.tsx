"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatCaseNo } from "@/domain/judgment";
import { useCaseStore } from "@/store/case-store";

/* 09 새 사건 접수 완료 */
export default function ReceivedPage() {
  const router = useRouter();
  const { verdict, peekNextSeq, resetCase } = useCaseStore();
  const [nextNo, setNextNo] = useState<string | null>(null);

  useEffect(() => {
    // localStorage는 클라이언트에서만 읽는다.
    setNextNo(formatCaseNo(peekNextSeq()));
  }, [peekNextSeq]);

  const startNew = () => {
    resetCase();
    router.push("/intake/story");
  };

  return (
    <div className="scr">
      <div className="pad" style={{ paddingTop: 40 }}>
        <div className="laurel">🔨</div>
        <h1 className="tt" style={{ marginTop: 20 }}>
          새로운 사건이 접수되었습니다!
        </h1>
        <div className="caseno">
          <span className="k">사 건 번 호</span>
          <span className="v">{nextNo ?? "…"}</span>
        </div>
        <p className="sub" style={{ marginTop: 18 }}>
          재판부가 성실히 심리하겠습니다.
        </p>
        <div className="grow" />
        <div className="stack">
          {verdict && (
            <Link className="btn" href="/verdict">
              사건 내용 확인하기
            </Link>
          )}
          <button className={verdict ? "btn line" : "btn"} type="button" onClick={startNew}>
            새 사건 접수하기
          </button>
        </div>
      </div>
    </div>
  );
}
