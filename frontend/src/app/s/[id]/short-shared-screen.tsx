"use client";

import { useRouter } from "next/navigation";
import { SaveVerdictImage } from "@/components/SaveVerdictImage";
import { VerdictDoc } from "@/components/VerdictDoc";
import type { Verdict } from "@/domain/judgment";
import { useCaseStore } from "@/store/case-store";
import { DefenseSection } from "@/components/DefenseSection";
import { JurySection } from "@/components/JurySection";
import type { DefenseResponseDoc } from "@/domain/response";

export interface SharedCase {
  verdict: Verdict;
  responseDoc: DefenseResponseDoc | null;
  seq: number;
  token: string;
}

/* 짧은 공유 링크 수신 화면 — 서버에 보관된 원본 판결문을 그대로 보여준다. */
export function ShortSharedScreen({ shared }: { shared: SharedCase | null }) {
  const verdict = shared?.verdict;
  const router = useRouter();
  const { resetCase } = useCaseStore();

  const startMine = () => {
    resetCase();
    router.push("/intake/story");
  };

  if (!verdict) {
    return (
      <div className="scr">
        <div className="pad">
          <h1 className="tt">사건 기록을 열 수 없습니다</h1>
          <p className="sub">링크가 잘못되었거나, 법원 서버가 잠에서 깨는 중입니다. 잠시 후 새로고침해 주세요.</p>
          <div className="grow" />
          <button className="btn" type="button" onClick={startMine}>
            내 사건 접수하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scr verdict-scr">
      <div className="pad">
        <p className="shared-label">📨 공유받은 판결문</p>
        <VerdictDoc verdict={verdict} />
        {shared && <JurySection seq={shared.seq} token={shared.token} result={verdict.result} />}
        {shared && <DefenseSection key={`${shared.seq}-${shared.token}`} seq={shared.seq} token={shared.token} initial={shared.responseDoc} />}
        <div className="grow" />
        <div className="stack" style={{ marginTop: 14 }}>
          <button className="btn" type="button" onClick={startMine}>
            나도 사건 접수하기
          </button>
          <SaveVerdictImage verdict={verdict} />
        </div>
      </div>
    </div>
  );
}
