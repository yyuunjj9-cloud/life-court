"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DemandDocView } from "@/components/LegalDocs";
import { formatKoreanDate } from "@/domain/date";
import { useCaseStore } from "@/store/case-store";

/* 13 내용증명 — 재판 전 경고장 */
export default function DemandPage() {
  const router = useRouter();
  const { demand, submitCase } = useCaseStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!demand) router.replace("/intake/filing");
  }, [demand, router]);

  if (!demand) return <div className="scr" />;

  // 수신인이 회신할 리 없으므로, 바로 정식 고소로 전환하는 길을 열어 둔다.
  const escalate = async () => {
    if (pending) return;
    setPending(true);
    setError(false);
    const ok = await submitCase("complaint");
    if (!ok) {
      setError(true);
      setPending(false);
      return;
    }
    router.push("/trial");
  };

  return (
    <div className="scr">
      <div className="pad">
        <DemandDocView doc={demand} date={formatKoreanDate(new Date())} />
        {error && <div className="help err">법원 서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.</div>}
        <div className="grow" />
        <div className="stack" style={{ marginTop: 14 }}>
          <button className="btn dark" type="button" disabled={pending} onClick={escalate}>
            {pending ? "접수 중..." : "…3일이 지나도 회신이 없다 (재판 진행)"}
          </button>
          <div className="btn-row">
            <Link className="btn sm" href="/save?doc=demand">
              문서 저장
            </Link>
            <Link className="btn line sm" href="/intake/filing">
              접수 방식 다시 선택
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
