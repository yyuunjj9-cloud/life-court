import Link from "next/link";

const NOTES = [
  "본 서비스는 오락 목적의 가상 콘텐츠이며, 실제 법률 자문·법률 판단 또는 실제 판결이 아닙니다.",
  "입력하신 내용은 시스템 내에서만 사용되며, 외부에 저장되거나 공유되지 않습니다.",
  "타인의 개인정보, 불법 행위, 혐오 표현 등 부적절한 내용은 입력할 수 없습니다.",
  "모든 판결 결과는 템플릿/규칙 기반으로 생성되며, 실제 법령이나 판례와 무관합니다.",
];

/* 10 안내(고지) 페이지 */
export default function NoticePage() {
  return (
    <div className="scr">
      <div className="pad">
        <h1 className="tt" style={{ marginBottom: 18 }}>
          안내 사항
        </h1>
        <div className="notes">
          {NOTES.map((text, i) => (
            <div className="note" key={i}>
              <span className="art">제{i + 1}조</span>
              <p>{text}</p>
            </div>
          ))}
        </div>
        <div className="grow" />
        <Link className="btn" href="/">
          확인하고 계속하기
        </Link>
      </div>
    </div>
  );
}
