"use client";

import { useState } from "react";
import { Burst } from "@/components/Burst";
import { countHits, reactionFor, type CounterRound } from "@/domain/countersuit-game";

/**
 * 맞고소 반박 카드 게임 — 궤변마다 맞는 반박 카드를 고른다.
 * 위쪽 '재판부 마음' 게이지가 맞힐 때마다 차고, needed칸을 넘으면 맞고소가 기각된다.
 */
export function CountersuitGame({ rounds, needed, onDone }: {
  rounds: CounterRound[];
  needed: number;
  onDone: (picks: number[]) => void;
}) {
  const [round, setRound] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const current = rounds[round];
  const picked = picks[round];
  const answered = picked !== undefined;
  const right = answered && picked === current.answer;
  const hits = countHits(rounds, picks);
  const last = round + 1 >= rounds.length;

  const choose = (i: number) => {
    if (answered) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(30);
    setPicks((prev) => [...prev.slice(0, round), i]);
  };

  return (
    <div className="csg">
      <div className="csg-head">
        <span>
          제{round + 1}라운드 <small>/ {rounds.length}</small>
        </span>
        <span className="csg-gauge" role="img" aria-label={`재판부 마음 ${hits}칸, 기각까지 ${needed}칸 필요`}>
          <small>재판부 마음</small>
          {rounds.map((_, i) => (
            <i key={i} className={[i < hits ? "on" : "", i === needed - 1 ? "goal" : ""].join(" ").trim() || undefined} />
          ))}
        </span>
      </div>
      <p className="csg-speaker">맞고소인 측 궤변</p>
      <p className="csg-claim">“{current.claim}”</p>
      <p className="csg-speaker">반박 카드를 고르세요</p>
      <div className="csg-cards">
        {current.options.map((option, i) => {
          const state = !answered ? "" : i === current.answer ? " right" : i === picked ? " wrong" : " dim";
          return (
            <button key={i} type="button" className={`csg-card${state}`} disabled={answered} onClick={() => choose(i)}>
              {option}
            </button>
          );
        })}
      </div>
      <div className="csg-feedback" aria-live="polite">
        {answered && (
          <>
            <Burst
              text={right ? "Sustained!" : "Overruled!"}
              variant={right ? "sustained" : "overruled"}
              width={124}
              label={right ? "반박 인정" : "반박 기각"}
            />
            <p className="csg-reaction">{reactionFor(round, right)}</p>
          </>
        )}
      </div>
      <div className="grow" />
      <button
        className="btn"
        type="button"
        disabled={!answered}
        onClick={() => (last ? onDone(picks) : setRound(round + 1))}
      >
        {!answered ? "카드를 골라 주세요" : last ? "판결 듣기" : "다음 궤변"}
      </button>
    </div>
  );
}
