"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Burst } from "@/components/Burst";
import { JurySummary } from "@/components/JurySection";
import { VerdictDoc } from "@/components/VerdictDoc";
import { RAISE_BLOCK_NOTE, raiseBlock } from "@/domain/judgment";
import { useCaseStore } from "@/store/case-store";

/* 06 판결 결과 */
export default function VerdictPage() {
  const router = useRouter();
  const { verdict, caseSeq, ownerToken, fileAppeal, hydrated } = useCaseStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 접수 없이 직접 진입한 경우
    if (hydrated && !verdict) router.replace("/");
  }, [verdict, router, hydrated]);

  // 선고 순간의 법봉 3타 — 진동 미지원 기기(iOS 등)에서는 조용히 무시된다.
  useEffect(() => {
    if (verdict && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([45, 70, 110]);
    }
  }, [verdict]);

  if (!verdict) return <div className="scr" />;

  const block = raiseBlock(verdict.result, verdict.crime);

  const appeal = async () => {
    if (pending) return;
    setPending(true);
    setError(false);
    const ok = await fileAppeal();
    if (!ok) {
      setError(true);
      setPending(false);
      return;
    }
    router.push("/appeal");
  };

  return (
    <div className="scr verdict-scr">
      <div className="verdict-flash">
        <div className="burst-wrap">
          <Burst text="판결 선고!" width={300} />
        </div>
      </div>
      <div className="pad">
        <VerdictDoc verdict={verdict} />
        <Link className="counter-alert" href="/countersuit">
          <span className="ca-mark">急</span>
          <span className="ca-text">
            가상의 피고가 <b>맞고소장</b>을 냈습니다 — 확인하기
          </span>
          <span className="ca-arrow">›</span>
        </Link>
        {caseSeq !== null && ownerToken && <JurySummary seq={caseSeq} ownerToken={ownerToken} result={verdict.result} />}
        {error && <div className="help err">법원 서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.</div>}
        <div className="grow" />
        {block && <p className="raise-note">{RAISE_BLOCK_NOTE[block]}</p>}
        <div className="btn-row" style={{ marginTop: 14 }}>
          {/* 더 무거워질 수 없는 사건은 기각만 나오므로 항소를 받지 않고 이유를 먼저 알린다 */}
          <button className="btn dark sm" type="button" disabled={pending || Boolean(block)} onClick={appeal}>
            {block === "max" ? "이미 최고 처분" : block ? "항소 불가" : pending ? "항소 중..." : "항소하기"}
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
