import type { AppealVerdict, Verdict } from "@/domain/judgment";

/** 제1심 판결문 문서 */
export function VerdictDoc({ verdict }: { verdict: Verdict }) {
  return (
    <div className="vdoc">
      <p className="vt">판 결 문</p>
      <p className="vs">오늘의 생활법원 제1심 재판부</p>
      <div className="vmeta">
        <span className="k">사건번호</span>
        <span className="v">{verdict.caseNo}</span>
        <span className="k">사 건 명</span>
        <span className="v">{verdict.caseName}</span>
        <span className="k">피　　고</span>
        <span className="v">{verdict.defendant}</span>
        <span className="k">가상 죄명</span>
        <span className="v crime">{verdict.crime}</span>
      </div>
      <div className="vsec">
        <p className="k">주 문</p>
        <p className="t">{verdict.order}</p>
      </div>
      <div className="vsec">
        <p className="k">판 결 이 유</p>
        <p className="t">{verdict.reasoning}</p>
      </div>
      <div className="vsec">
        <p className="k">생 활 개 선 권 고</p>
        <p className="t">{verdict.advice}</p>
      </div>
      <div className="vfinal">
        <span className="stamp">
          생활
          <br />
          법원
        </span>
        <p className="w">{verdict.result}</p>
        <p className="n">{verdict.resultNote}</p>
      </div>
    </div>
  );
}

/** 항소심 판결문 문서 */
export function AppealDoc({ verdict, appeal, date }: { verdict: Verdict; appeal: AppealVerdict; date: string }) {
  return (
    <div className="vdoc">
      <p className="vt appeal">항소심 판결문</p>
      <p className="vs">오늘의 생활법원 항소심 재판부</p>
      <div className="vmeta">
        <span className="k">사건번호</span>
        <span className="v">{verdict.caseNo}</span>
        <span className="k">사 건 명</span>
        <span className="v">{verdict.caseName}</span>
        <span className="k">피　　고</span>
        <span className="v">{verdict.defendant}</span>
      </div>
      <div className="vsec">
        <p className="k">항 소 심 주 문</p>
        <p className="center-order">{appeal.order}</p>
        <p className="t" style={{ textAlign: "center" }}>
          {appeal.orderNote}
        </p>
      </div>
      <div className="vsec">
        <p className="k">항 소 심 판 결 이 유</p>
        <p className="t">{appeal.reasoning}</p>
      </div>
      <div className="vsign">
        {date}
        <br />
        생활법원 항소심 재판부
        <span className="stamp" style={{ right: 2, top: -4 }}>
          생활
          <br />
          법원
        </span>
      </div>
    </div>
  );
}
