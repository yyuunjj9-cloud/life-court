"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MemoBoard } from "@/components/MemoBoard";

/** 문의·사연 삭제 요청 Google Form. 비워두면 링크가 노출되지 않는다. */
const CONTACT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdY_Kw2W9He715Qa8RdqE0ztuVskSF00I-hoWE06oDE8X3q0w/viewform?usp=sharing";

const NOTES = [
  "본 서비스는 오락 목적의 가상 콘텐츠이며, 실제 법률 자문·법률 판단 또는 실제 판결이 아닙니다.",
  "입력하신 내용은 판결 생성을 위해 생활법원 서버로 전송되어 사건 기록으로 보관됩니다. 서비스 운영에 필요한 서버·데이터베이스 호스팅과 이용자가 직접 공유한 링크를 제외하고는 다른 목적으로 사용하거나 제3자에게 제공하지 않습니다. 방문 통계는 사연 내용 없이 페이지 방문 정도만 집계합니다. 운영자 화면에는 사연 내용이 나오지 않으며, 운영자는 삭제·문의 요청 처리나 오류 확인에 필요한 경우가 아니면 사연을 열람하지 않습니다.",
  "타인의 개인정보, 불법 행위, 혐오 표현 등 부적절한 내용은 입력할 수 없습니다.",
  "판결 결과는 템플릿과 규칙으로 만든 가상의 결과이며, 실제 법령이나 판례를 적용한 판단이 아닙니다. 절차 일부는 실제와 비슷하게 꾸몄지만 같지는 않습니다. '훈방 조치', '조건부 유죄', '괘씸죄' 등 일부는 재미를 위한 가상 용어이며 실제 법정 용어가 아닙니다. 실제로는 무엇과 비슷한지는 아래 '생활법원 용어 풀이'에서 볼 수 있습니다.",
  "업데이트 메모판에 남긴 아이디어는 운영자에게 전달되어 보관됩니다. 공개를 요청한 아이디어도 운영자가 확인한 뒤에만 입력한 닉네임과 함께 게시되며, 게시된 아이디어의 삭제는 아래 문의 링크로 요청할 수 있습니다. 아이디어와 닉네임에는 실명 등 개인정보를 적지 마세요.",
];

/* 10 안내(고지) 페이지 */
export default function NoticePage() {
  const router = useRouter();
  // 운영자 열쇠가 저장된 기기에서만 운영자 화면으로 돌아가는 링크를 보여 준다.
  const [operator, setOperator] = useState(false);
  useEffect(() => {
    try {
      setOperator(Boolean(window.localStorage.getItem("lifecourt.adminToken")));
    } catch {
      /* 저장소를 쓸 수 없는 브라우저 */
    }
  }, []);

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
        <Link className="glossary-link" href="/glossary">
          📖 생활법원 용어 풀이 — 진짜 법정이라면? →
        </Link>
        <MemoBoard />
        <div className="grow" />
        {operator && (
          <Link className="operator-link" href="/ideas/admin">
            🔑 운영자 화면
          </Link>
        )}
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
