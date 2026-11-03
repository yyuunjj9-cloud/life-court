import type { ComplaintDoc, CountersuitDoc, DemandLetterDoc } from "@/domain/documents";

/** 고소장 / 고발장 문서 */
export function ComplaintDocView({ doc, date }: { doc: ComplaintDoc; date: string }) {
  const subject = doc.kind === "complaint" ? "고소인" : "고발인";
  const respondentLabel = doc.kind === "complaint" ? "피고소인" : "피고발인";
  return (
    <div className="vdoc">
      <p className="vt appeal">{doc.kind === "complaint" ? "고 소 장" : "고 발 장"}</p>
      <p className="vs">오늘의 생활법원 민원접수과</p>
      <div className="vmeta">
        <span className="k">사건번호</span>
        <span className="v">{doc.caseNo}</span>
        <span className="k">{subject}</span>
        <span className="v">{doc.complainant}</span>
        <span className="k">{respondentLabel}</span>
        <span className="v">{doc.respondent}</span>
        <span className="k">가상 죄명</span>
        <span className="v crime">{doc.crime}</span>
      </div>
      <div className="vsec">
        <p className="k">{doc.kind === "complaint" ? "고 소 취 지" : "고 발 취 지"}</p>
        <p className="t">{doc.purpose}</p>
      </div>
      <div className="vsec">
        <p className="k">범 죄 사 실</p>
        <p className="t">{doc.facts}</p>
      </div>
      <div className="vsec">
        <p className="k">첨 부 증 거</p>
        <p className="t">
          {doc.evidence.map((e, i) => (
            <span key={e}>
              {i + 1}. {e}
              {i < doc.evidence.length - 1 && <br />}
            </span>
          ))}
        </p>
      </div>
      <div className="vsign">
        {date}
        <br />위 {subject} (인)
        <span className="stamp" style={{ right: 2, top: -4 }}>
          생활
          <br />
          법원
        </span>
      </div>
    </div>
  );
}

/** 내용증명 문서 */
export function DemandDocView({ doc, date }: { doc: DemandLetterDoc; date: string }) {
  return (
    <div className="vdoc">
      <p className="vt appeal">내 용 증 명</p>
      <p className="vs">생활 분쟁 사전 경고 서면</p>
      <div className="vmeta">
        <span className="k">제　　목</span>
        <span className="v">{doc.title}</span>
        <span className="k">발 신 인</span>
        <span className="v">{doc.sender}</span>
        <span className="k">수 신 인</span>
        <span className="v">{doc.receiver}</span>
      </div>
      <div className="vsec">
        <p className="k">경 위</p>
        <p className="t">{doc.background}</p>
      </div>
      {doc.rebuttal && (
        <div className="vsec">
          <p className="k">예 상 해 명</p>
          <p className="t">{doc.rebuttal}</p>
        </div>
      )}
      <div className="vsec">
        <p className="k">요 구 사 항</p>
        <p className="t">{doc.demand}</p>
      </div>
      <div className="vsec">
        <p className="k">이 행 기 한</p>
        <p className="t">{doc.deadline}</p>
      </div>
      <div className="vsec">
        <p className="k">경 고</p>
        <p className="t" style={{ color: "var(--objection-red)", fontWeight: 700 }}>
          {doc.warning}
        </p>
      </div>
      <div className="vsign">
        {date}
        <br />위 발신인 (인)
        <span className="stamp" style={{ right: 2, top: -4 }}>
          내용
          <br />
          증명
        </span>
      </div>
    </div>
  );
}

/** 맞고소장 문서 + 재판부 처리 결과 */
export function CountersuitDocView({ doc, date }: { doc: CountersuitDoc; date: string }) {
  return (
    <div className="vdoc">
      <p className="vt appeal">맞 고 소 장</p>
      <p className="vs">오늘의 생활법원 민원접수과 (가상 피고 측 제출)</p>
      <div className="vmeta">
        <span className="k">맞고소인</span>
        <span className="v">{doc.counterComplainant}</span>
        <span className="k">피맞고소인</span>
        <span className="v">{doc.counterRespondent}</span>
        <span className="k">가상 죄명</span>
        <span className="v crime">{doc.crime}</span>
      </div>
      <div className="vsec">
        <p className="k">맞 고 소 사 실</p>
        <p className="t">{doc.facts}</p>
      </div>
      {doc.objections && (
        <div className="vsec">
          <p className="k">변 론 기 록</p>
          <p className="t">
            이의 제기 {doc.objections.total}회 중 {doc.objections.hits}회 인용
            {doc.objections.hits === doc.objections.total && " — 완벽 변론"}
          </p>
        </div>
      )}
      <div className="vfinal">
        <span className="stamp">
          생활
          <br />
          법원
        </span>
        <p className="w" style={{ fontSize: 22 }}>
          {doc.rulingLabel}
        </p>
        <p className="n">{doc.rulingNote}</p>
      </div>
      <div className="vsign">
        {date}
        <br />
        생활법원 맞고소 전담 재판부
      </div>
      <p className="virtual-note">이 맞고소는 혼자 즐기는 가상 연출이며 상대방에게 전달되지 않습니다.</p>
    </div>
  );
}
