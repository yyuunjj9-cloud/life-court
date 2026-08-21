"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TRIAL_STEPS } from "@/domain/judgment";
import { useCaseStore } from "@/store/case-store";

const STEP_MS = 900;

/* 05 심리 진행 — 증언 콘솔 */
export default function TrialPage() {
  const router = useRouter();
  const { verdict } = useCaseStore();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => {
        if (s + 1 > TRIAL_STEPS.length) {
          clearInterval(timer);
          return s;
        }
        return s + 1;
      });
    }, STEP_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (step > TRIAL_STEPS.length - 1) {
      const t = setTimeout(() => {
        // 접수된 사건이 없으면(직접 URL 진입 등) 접수 화면으로 보낸다.
        router.replace(verdict ? "/verdict" : "/intake/story");
      }, STEP_MS);
      return () => clearTimeout(t);
    }
  }, [step, router, verdict]);

  return (
    <div className="scr dark">
      <span className="pillar l" />
      <span className="pillar r" />
      <div className="pad">
        <h1 className="tt" style={{ color: "var(--parchment)", textShadow: "0 2px 10px rgba(0,0,0,.6)" }}>
          심리 진행 중입니다
        </h1>
        <div className="console">
          <div className="head">
            <span className="t">심 리 기 록</span>
            <span className="rec">
              <i />
              LIVE
            </span>
          </div>
          <ul>
            {TRIAL_STEPS.map((label, i) => (
              <li key={label} className={i > step ? "dim" : undefined}>
                <span className="mk">{i < step ? "✓" : i === step ? "▶" : ""}</span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="gavel-wait">
          잠시만 기다려주세요 <span className="g">🔨</span>
        </div>
      </div>
    </div>
  );
}
