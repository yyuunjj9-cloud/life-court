"use client";

import { useEffect, useState } from "react";
import { ApiError, juryApi, voterId, type JuryTally, type JuryVote } from "@/lib/api";

/** 재판부 판결이 유죄 쪽인지 — 배심원 평결과 비교해 '의견 불일치'를 보여 주는 데만 쓴다. */
function courtSaysGuilty(result: string): boolean {
  return !["무죄", "훈방 조치"].includes(result);
}

/** 평결 요약 — 만장일치·다수결·가부동수를 실제 평결 방식처럼 부른다. */
export function juryHeadline(t: Pick<JuryTally, "guilty" | "notGuilty">): string {
  const total = t.guilty + t.notGuilty;
  if (total === 0) return "아직 평결이 없습니다";
  if (t.guilty === total) return `만장일치 유죄 (${total}명)`;
  if (t.notGuilty === total) return `만장일치 무죄 (${total}명)`;
  if (t.guilty === t.notGuilty) return `가부동수 (유죄 ${t.guilty} : 무죄 ${t.notGuilty})`;
  return `${t.guilty > t.notGuilty ? "다수 유죄" : "다수 무죄"} (유죄 ${t.guilty} : 무죄 ${t.notGuilty})`;
}

function JuryResult({ tally, result }: { tally: JuryTally; result: string }) {
  const total = tally.guilty + tally.notGuilty;
  const guiltyPct = total ? Math.round((tally.guilty / total) * 100) : 0;
  const juryGuilty = tally.guilty > tally.notGuilty;
  const split = total > 0 && tally.guilty !== tally.notGuilty && juryGuilty !== courtSaysGuilty(result);
  return (
    <>
      <p className="jury-headline">{juryHeadline(tally)}</p>
      {total > 0 && (
        <div className="jury-bar" role="img" aria-label={`유죄 ${tally.guilty}표, 무죄 ${tally.notGuilty}표`}>
          <span className="g" style={{ width: `${guiltyPct}%` }} />
          <span className="n" style={{ width: `${100 - guiltyPct}%` }} />
        </div>
      )}
      <p className="jury-court">재판부 판결: {result}</p>
      {split && <p className="jury-split">재판부와 배심원단의 의견이 엇갈렸습니다!</p>}
    </>
  );
}

const NOTE = "배심원 평결은 재판부 판결을 바꾸지 않는 참고 의견입니다. 실제 국민참여재판에서도 배심원 평결은 법원을 기속하지 않습니다.";

/* 공유 링크 수신 화면 — 링크를 받은 사람이 배심원으로 유·무죄를 평결한다. */
export function JurySection({ seq, token, result }: { seq: number; token: string; result: string }) {
  const [tally, setTally] = useState<JuryTally | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    juryApi.tally(seq, token, voterId()).then(
      (t) => alive && setTally(t),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [seq, token]);

  const vote = async (choice: JuryVote) => {
    if (sending) return;
    setSending(true);
    setFailed(false);
    const voter = voterId();
    try {
      setTally(await juryApi.vote(seq, token, voter, choice));
    } catch (error) {
      // 이미 투표한 기기면 지금 집계를 다시 읽는다.
      if (error instanceof ApiError && error.status === 409) setTally(await juryApi.tally(seq, token, voter).catch(() => null));
      else setFailed(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="jury" aria-labelledby="jury-title">
      <h2 id="jury-title" className="lbl">
        생활 배심원단
      </h2>
      {tally?.mine ? (
        <>
          <p className="jury-mine">당신의 평결: {tally.mine === "guilty" ? "유죄" : "무죄"}</p>
          <JuryResult tally={tally} result={result} />
        </>
      ) : (
        <>
          <p className="jury-ask">이 사건의 배심원이 되어 주세요. 당신의 평결은?</p>
          <div className="btn-row">
            <button className="btn sm" type="button" disabled={sending || !tally} onClick={() => vote("guilty")}>
              유죄
            </button>
            <button className="btn dark sm" type="button" disabled={sending || !tally} onClick={() => vote("not_guilty")}>
              무죄
            </button>
          </div>
          <p className="jury-note">평결하면 다른 배심원들의 의견을 볼 수 있습니다. 한 기기에서 한 번 평결할 수 있습니다.</p>
        </>
      )}
      {failed && <p className="help err">지금은 평결을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
      <p className="jury-note">{NOTE}</p>
    </section>
  );
}

/* 사건을 낸 사람의 판결 화면 — 배심원 평결 집계만 본다. */
export function JurySummary({ seq, ownerToken, result }: { seq: number; ownerToken: string; result: string }) {
  const [tally, setTally] = useState<JuryTally | null>(null);

  const load = () => {
    juryApi.ownerTally(seq, ownerToken).then(setTally, () => setTally(null));
  };
  useEffect(load, [seq, ownerToken]);

  if (!tally) return null;
  const total = tally.guilty + tally.notGuilty;
  return (
    <section className="jury owner" aria-labelledby="jury-owner-title">
      <h2 id="jury-owner-title" className="lbl">
        생활 배심원단
      </h2>
      {total === 0 ? (
        <p className="jury-ask">아직 평결이 없습니다. 판결문을 공유하면 링크를 받은 친구들이 배심원으로 평결할 수 있습니다.</p>
      ) : (
        <JuryResult tally={tally} result={result} />
      )}
      <button className="btn line sm" type="button" onClick={load} style={{ marginTop: 10 }}>
        평결 새로 보기
      </button>
    </section>
  );
}
