"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Burst } from "@/components/Burst";
import { VerdictDoc } from "@/components/VerdictDoc";
import { useCaseStore } from "@/store/case-store";

/* 06 판결 결과 */
export default function VerdictPage() {
  const router = useRouter();
  const { verdict, fileAppeal } = useCaseStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 접수 없이 직접 진입한 경우
    if (!verdict) router.replace("/");
  }, [verdict, router]);

  // 선고 순간의 법봉 3타 — 진동 미지원 기기(iOS 등)에서는 조용히 무시된다.
  useEffect(() => {
    if (verdict && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([45, 70, 110]);
    }
  }, [verdict]);

  if (!verdict) return <div className="scr" />;

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
            피고 측이 <b>맞고소장</b>을 제출했습니다 — 확인하기
          </span>
          <span className="ca-arrow">›</span>
        </Link>
        {error && <div className="help err">법원 서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.</div>}
        <div className="grow" />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn dark sm" type="button" disabled={pending} onClick={appeal}>
            {pending ? "항소 중..." : "항소하기"}
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
