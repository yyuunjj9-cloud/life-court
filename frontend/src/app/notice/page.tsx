"use client";

import { useRouter } from "next/navigation";

/** 문의·사연 삭제 요청 Google Form. 비워두면 링크가 노출되지 않는다. */
const CONTACT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdY_Kw2W9He715Qa8RdqE0ztuVskSF00I-hoWE06oDE8X3q0w/viewform?usp=sharing";

const NOTES = [
  "본 서비스는 오락 목적의 가상 콘텐츠이며, 실제 법률 자문·법률 판단 또는 실제 판결이 아닙니다.",
  "입력하신 내용은 판결 생성을 위해 생활법원 서버로 전송되어 사건 기록으로 보관되며, 이용자가 직접 공유한 링크를 제외하고 그 외의 용도로 사용되거나 제3자에게 공유되지 않습니다.",
  "타인의 개인정보, 불법 행위, 혐오 표현 등 부적절한 내용은 입력할 수 없습니다.",
  "모든 판결 결과는 템플릿/규칙 기반으로 생성되며, 실제 법령이나 판례와 무관합니다.",
];

/* 10 안내(고지) 페이지 */
export default function NoticePage() {
  const router = useRouter();

  // 보던 화면으로 복귀 — 판결문을 보다 안내를 열어도 흐름이 끊기지 않는다.
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

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
        {CONTACT_FORM_URL && (
          <a className="contact-link" href={CONTACT_FORM_URL} target="_blank" rel="noreferrer">
            문의 · 사연 삭제 요청 · 오류 제보 →
          </a>
        )}
        <button className="btn" type="button" onClick={goBack}>
          확인하고 계속하기
        </button>
      </div>
    </div>
  );
}
