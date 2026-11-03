import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "생활법원 용어 풀이 | 오늘의 생활법원",
  description: "생활법원에서 쓰는 말이 진짜 법정에서는 무엇과 비슷한지 풀어 봅니다.",
};

type Kind = "real" | "borrowed" | "fiction";

const KIND_LABEL: Record<Kind, string> = {
  real: "실제 용어",
  borrowed: "빌려 온 말",
  fiction: "가상 용어",
};

/**
 * 앱 용어 ↔ 실제 절차 대응표. 재미있는 이름은 그대로 쓰되 무엇이 가상인지 밝힌다.
 * 조문은 2026-11-03 법제처 국가법령정보센터에서 확인했다.
 */
const TERMS: { term: string; kind: Kind; real: string; law?: string }[] = [
  { term: "무죄", kind: "real", real: "범죄가 되지 않거나 증명이 없을 때 법원이 선고하는 판결입니다.", law: "형사소송법 제325조" },
  {
    term: "훈방 조치",
    kind: "fiction",
    real: "법원 판결이 아니라, 경찰이 아주 가벼운 일을 재판에 넘기지 않고 주의를 주는 실무에서 빌려 왔습니다. 법원 판결 중에서는 형의 선고를 미뤄 주는 '선고유예'가 비슷한 편입니다.",
    law: "형법 제59조(선고유예)",
  },
  {
    term: "조건부 유죄",
    kind: "fiction",
    real: "실제로는 '집행유예'와 비슷합니다. 형은 정하되 집행을 미루고, 사회봉사·수강 같은 조건을 붙일 수 있습니다.",
    law: "형법 제62조, 제62조의2",
  },
  {
    term: "유죄",
    kind: "real",
    real: "실제 유죄 판결에는 벌금·징역 같은 형이 함께 정해집니다. 생활법원은 형 대신 생활 벌칙을 내립니다.",
    law: "형법 제41조(형의 종류)",
  },
  {
    term: "괘씸죄 가중 유죄",
    kind: "fiction",
    real: "형법에는 '괘씸죄'라는 죄명이 없습니다. 형을 무겁게 하는 실제 제도의 예로는 형을 마친 뒤 3년 안에 다시 죄를 지은 경우의 '누범 가중'이 있습니다.",
    law: "형법 제35조(누범)",
  },
  { term: "고소 · 고발", kind: "real", real: "피해자가 수사기관에 처벌을 요청하면 고소, 피해자가 아닌 사람이 알리면 고발입니다." },
  {
    term: "내용증명",
    kind: "real",
    real: "우체국이 보낸 문서의 내용과 날짜를 증명해 주는 우편 제도입니다. 생활법원은 문서만 만들고 실제로 보내지는 않습니다.",
  },
  {
    term: "원고 · 피고",
    kind: "borrowed",
    real: "민사 재판에서 쓰는 말입니다. 형사 재판에서는 검사와 '피고인'이라고 부릅니다. 생활법원은 익숙한 말이라 함께 씁니다.",
  },
  {
    term: "항소",
    kind: "real",
    real: "1심 판결에 불복해 2심 판단을 받는 절차입니다. 실제 형사 재판에서 항소할 수 있는 사람은 검사 또는 피고인이며, 생활법원의 '원고 항소'는 검사 항소에 가깝습니다.",
    law: "형사소송법 제338조",
  },
  {
    term: "상고 · 대법원",
    kind: "real",
    real: "2심 판결에 불복해 대법원 판단을 받는 절차입니다. 실제로는 법령 위반 같은 이유로만 상고할 수 있습니다.",
    law: "형사소송법 제371조, 제383조",
  },
  {
    term: "파기자판",
    kind: "real",
    real: "대법원이 원심을 깨고 사건을 돌려보내지 않은 채 직접 판결하는 것입니다. 실제로는 사건을 원심으로 돌려보내는 '파기환송'이 더 흔한 편입니다.",
    law: "형사소송법 제396조, 제397조",
  },
  {
    term: "맞고소",
    kind: "borrowed",
    real: "법률 용어라기보다 흔히 쓰는 말로, 상대가 맞서서 따로 고소하는 것을 말합니다. 생활법원의 맞고소는 혼자 즐기는 가상 연출입니다.",
  },
  {
    term: "답변서",
    kind: "borrowed",
    real: "민사 재판에서 피고가 소장에 대해 자기 입장을 적어 내는 서면입니다. 생활법원은 공유 링크를 받은 피고가 고르는 선택지로 대신합니다.",
  },
  {
    term: "Objection! · Sustained! · Overruled!",
    kind: "fiction",
    real: "미국 법정 드라마에서 익숙한 외침입니다. 한국 법정에서는 이런 외침을 보통 쓰지 않습니다.",
  },
];

/**
 * 재미를 위해 이름은 바꿔도 지키려는 규칙 — 각 항목은 자동 테스트로 확인한다.
 * 규칙 기반이라 예외가 있을 수 있으므로 단정하지 않고 조건과 예외를 함께 적는다.
 */
const PRINCIPLES = [
  "지금 규칙에서는 원고의 항소·상고가 받아들여지면 처분이 한 단계 무거워지고, 가벼워지지 않도록 했습니다.",
  "처분은 한 번에 한 단계씩만 바뀌고, 가장 무거운 처분을 넘지 않도록 했습니다.",
  "규칙상 근거가 부족하다고 본 사연은 유죄 처분까지 올리지 않습니다. 다만 규칙으로 판단하므로 이 구분이 틀릴 수 있습니다.",
  "판결문에는 사연에 없는 상대의 행동이나 동기를 사실로 적지 않도록 했습니다. 맞고소와 변론 게임 속 주장은 연출입니다.",
  "사연이 글자 하나까지 같고 사건 유형·관계·심각성·성향 선택도 같으면, 같은 규칙에서는 1심 판결이 같습니다. 항소·상고·맞고소 결과는 사건번호도 반영해 사건마다 달라질 수 있습니다.",
  "서버에 저장된 판결문은 나중에 규칙이 바뀌어도 고쳐 쓰지 않습니다. 예전 방식의 공유 링크는 다시 계산되어 달라질 수 있습니다.",
  "맞고소 변론에서 이의를 더 많이 막았다고 결과가 더 불리해지지는 않도록 했습니다.",
];

const KIND_ORDER: Kind[] = ["real", "borrowed", "fiction"];

/* 10-2 용어 풀이 — 생활법원의 말이 진짜 법정에서는 무엇과 비슷한가 */
export default function GlossaryPage() {
  return (
    <div className="scr">
      <div className="pad">
        <h1 className="tt">생활법원 용어 풀이</h1>
        <p className="sub">재미있는 이름은 그대로 쓰고, 진짜 법정이라면 무엇과 비슷한지 적어 두었습니다.</p>
        <div className="glossary-legend">
          {KIND_ORDER.map((k) => (
            <span className={`gl-kind ${k}`} key={k}>
              {KIND_LABEL[k]}
            </span>
          ))}
        </div>
        <div className="glossary">
          {TERMS.map((t) => (
            <div className="gl-item" key={t.term}>
              <div className="gl-head">
                <b>{t.term}</b>
                <span className={`gl-kind ${t.kind}`}>{KIND_LABEL[t.kind]}</span>
              </div>
              <p>{t.real}</p>
              {t.law && <span className="gl-law">{t.law}</span>}
            </div>
          ))}
        </div>
        <p className="lbl" style={{ marginTop: 26 }}>
          생활법원이 지키는 원칙
        </p>
        <ol className="principles">
          {PRINCIPLES.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        <p className="gl-foot">
          오락용으로 간단히 줄인 설명이라 실제와 다를 수 있으며, 법률 자문이 아닙니다. 조문은 2026년 11월 3일 법제처 국가법령정보센터에서 확인했습니다.
        </p>
        <div className="grow" />
        <Link className="btn" href="/notice" style={{ textAlign: "center", textDecoration: "none" }}>
          안내 사항으로
        </Link>
      </div>
    </div>
  );
}
