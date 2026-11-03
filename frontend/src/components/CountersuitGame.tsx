"use client";

import { useEffect, useRef, useState } from "react";
import { Burst } from "@/components/Burst";
import {
  judgePress,
  NEXT_ROUND_MS,
  redTailStart,
  ROUND_WINDOWS_MS,
  typingDuration,
  type PressResult,
} from "@/domain/countersuit-game";

/** 맞고소 혼자 변론 — 궤변 끝부분이 빨개지는 순간 이의를 제기한다. 끝나면 막은 수를 넘긴다. */
export function CountersuitGame({ lines, onDone }: { lines: string[]; onDone: (hits: number) => void }) {
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<PressResult[]>([]);
  const hits = results.filter((r) => r === "hit").length;

  return (
    <div className="csg">
      <div className="csg-head">
        <span>
          제{round + 1}라운드 <small>/ {lines.length}</small>
        </span>
        <span className="csg-score" role="img" aria-label={`이의 인용 ${hits}회`}>
          {lines.map((_, i) => (
            <i key={i} className={results[i] === "hit" ? "on" : results[i] ? "off" : undefined} />
          ))}
        </span>
      </div>
      <ObjectionRound
        key={round}
        line={lines[round]}
        windowMs={ROUND_WINDOWS_MS[round] ?? ROUND_WINDOWS_MS[ROUND_WINDOWS_MS.length - 1]}
        onResult={(result) => setResults((prev) => [...prev, result])}
        onNext={() => {
          if (round + 1 < lines.length) setRound(round + 1);
          else onDone(hits);
        }}
      />
    </div>
  );
}

/** 한 라운드 — 라운드마다 key로 새로 만들어 시간과 판정을 처음부터 잰다. */
function ObjectionRound({ line, windowMs, onResult, onNext }: {
  line: string;
  windowMs: number;
  onResult: (result: PressResult) => void;
  onNext: () => void;
}) {
  const [shown, setShown] = useState(0);
  const [red, setRed] = useState(false);
  const [outcome, setOutcome] = useState<PressResult | null>(null);
  const startedAt = useRef(0);
  const judged = useRef(false);
  const timers = useRef<number[]>([]);
  // 타이머가 처음 렌더의 함수를 붙잡아도 최신 콜백을 부르도록 한다.
  const callbacks = useRef({ onResult, onNext });
  useEffect(() => {
    callbacks.current = { onResult, onNext };
  });
  const duration = typingDuration(line);
  const tail = redTailStart(line);

  const judge = (pressed: boolean) => {
    if (judged.current) return;
    judged.current = true;
    timers.current.forEach((id) => window.clearTimeout(id));
    if (pressed && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(30);
    const result = judgePress(pressed ? performance.now() - startedAt.current : null, duration, windowMs);
    setShown(line.length);
    setOutcome(result);
    callbacks.current.onResult(result);
    timers.current = [window.setTimeout(() => callbacks.current.onNext(), NEXT_ROUND_MS)];
  };
  const judgeRef = useRef(judge);
  useEffect(() => {
    judgeRef.current = judge;
  });

  useEffect(() => {
    startedAt.current = performance.now();
    const typer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt.current;
      setShown(Math.min(line.length, Math.ceil((elapsed / duration) * line.length)));
    }, 30);
    timers.current = [
      typer,
      window.setTimeout(() => {
        window.clearInterval(typer);
        setShown(line.length);
        setRed(true);
      }, duration),
      window.setTimeout(() => judgeRef.current(false), duration + windowMs),
    ];
    const onKey = (event: KeyboardEvent) => {
      if ((event.code !== "Space" && event.key !== "Enter") || event.repeat) return;
      event.preventDefault();
      judgeRef.current(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      timers.current.forEach((id) => window.clearTimeout(id));
    };
  }, [line, duration, windowMs]);

  return (
    <div className={outcome === "hit" ? "csg-round shake" : "csg-round"}>
      <p className="csg-speaker">맞고소인 측 진술</p>
      <p className="csg-line">
        {red || outcome ? (
          <>
            {line.slice(0, tail)}
            <span className={red ? "csg-red" : undefined}>{line.slice(tail)}</span>
          </>
        ) : (
          <>
            {line.slice(0, shown)}
            {/* 아직 안 나온 글자도 자리를 차지해 카드 높이가 흔들리지 않는다 */}
            <span className="csg-ghost" aria-hidden>
              {line.slice(shown)}
            </span>
          </>
        )}
      </p>
      <div className="csg-feedback" aria-live="polite">
        {outcome === "hit" && <Burst text="Sustained!" variant="sustained" width={190} label="이의 인정" />}
        {outcome === "early" && <Burst text="Overruled!" variant="overruled" width={190} label="이의 기각 — 너무 일렀습니다" />}
        {outcome === "miss" && <p className="csg-miss">이의 없으면 넘어갑니다.</p>}
        {!outcome && <p className="csg-hint">{red ? "지금!" : "끝부분이 빨개지면 이의를 제기하세요"}</p>}
      </div>
      <div className="grow" />
      <button
        className="btn csg-press"
        type="button"
        disabled={outcome !== null}
        onPointerDown={(event) => {
          event.preventDefault();
          judge(true);
        }}
      >
        이의 있음!
      </button>
    </div>
  );
}
