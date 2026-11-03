"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Burst } from "@/components/Burst";
import { CountersuitGame } from "@/components/CountersuitGame";
import { CountersuitDocView } from "@/components/LegalDocs";
import { formatKoreanDate } from "@/domain/date";
import { useCaseStore } from "@/store/case-store";

/* 14 맞고소 — 피고의 역습. 들어오기만 해서는 접수되지 않고, 변론하거나 건너뛰어야 결과가 나온다. */
export default function CountersuitPage() {
  const router = useRouter();
  const { caseSeq, countersuit, fileCountersuit, loadCountersuitBrief, hydrated } = useCaseStore();
  const [lines, setLines] = useState<string[] | null>(null);
  const [stage, setStage] = useState<"intro" | "play" | "filing">("intro");
  // 접수 실패 시 같은 변론 결과로 다시 시도한다.
  const [hits, setHits] = useState<number | undefined>(undefined);
  const [error, setError] = useState(false);

  const file = (played?: number) => {
    setHits(played);
    setStage("filing");
    setError(false);
    fileCountersuit(played).then((ok) => {
      if (!ok) setError(true);
    });
  };

  useEffect(() => {
    if (!hydrated) return;
    if (caseSeq === null) {
      router.replace("/");
      return;
    }
    if (countersuit || lines || stage !== "intro") return;
    let alive = true;
    loadCountersuitBrief().then((brief) => {
      if (!alive) return;
      if (!brief) setError(true);
      // 다른 탭에서 이미 결과가 나왔다면 게임 없이 저장된 결과를 받아온다.
      else if (brief.done) file();
      else setLines(brief.lines);
    });
    return () => {
      alive = false;
    };
    // file은 매 렌더 새로 만들어지지만 결과가 없을 때 한 번만 부르면 되므로 의존성에서 뺀다.
  }, [caseSeq, countersuit, lines, stage, loadCountersuitBrief, router, hydrated]);

  if (caseSeq === null) return <div className="scr" />;

  if (countersuit) {
    return (
      <div className="scr">
        <div className="verdict-flash">
          <div className="burst-wrap">
            <Burst text={countersuit.accepted ? "맞고소?!" : "Case dismissed!"} width={300} variant={countersuit.accepted ? "objection" : "dismissed"} />
          </div>
        </div>
        <div className="pad">
          {countersuit.objections && (
            <p className="csg-outcome">{countersuit.accepted ? "억울한 쪽이 음료를 사게 되었습니다" : "적반하장 진압 완료"}</p>
          )}
          <CountersuitDocView doc={countersuit} date={formatKoreanDate(new Date())} />
          <p className="court-notice">재판부 공지: 다음 개정부터 피고 본인 출석이 허용될 예정입니다.</p>
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

  if (stage === "play" && lines) {
    return (
      <div className="scr dark">
        <div className="pad">
          <CountersuitGame lines={lines} onDone={(played) => file(played)} />
        </div>
      </div>
    );
  }

  if (stage === "filing" || !lines) {
    return (
      <div className="scr">
        <div className="pad">
          <h1 className="tt">{stage === "filing" ? "맞고소 판결 선고 중..." : "맞고소장 접수 확인 중..."}</h1>
          {error && (
            <>
              <p className="sub" style={{ color: "var(--objection-red)" }}>
                법원 서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.
              </p>
              {stage === "filing" && (
                <button className="btn sm" type="button" style={{ marginTop: 16 }} onClick={() => file(hits)}>
                  다시 시도
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="scr dark">
      <div className="pad csg-intro">
        <span className="kicker">맞고소 변론</span>
        <h1 className="hero-t">
          <span className="acc">적반하장</span>입니다.
        </h1>
        <p className="hero-s">
          피고 측이 오히려 맞고소장을 냈습니다.
          <br />
          궤변이 빨개지면 이의를 제기하세요.
        </p>
        <ul className="csg-rules">
          <li>궤변 3개가 차례로 나옵니다.</li>
          <li>끝부분이 빨개지는 순간 ‘이의 있음!’을 누르세요.</li>
          <li>너무 빨리 누르면 기각됩니다. 많이 막을수록 맞고소가 기각되기 쉽습니다.</li>
        </ul>
        <div className="grow" />
        <div className="stack">
          <button className="btn" type="button" onClick={() => setStage("play")}>
            변론 시작
          </button>
          <button className="btn dark sm" type="button" onClick={() => file()}>
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  );
}
