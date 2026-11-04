import type { CaseType } from "@/domain/judgment";
import { exampleDay } from "@/domain/examples";

/**
 * 첫 화면 판결 예시 — 사연 입력 화면의 가상 예문 중 주문이 두 줄 안에 들어가는 것만 골랐다.
 * 죄목·주문은 실제 판결 생성 결과와 같은지 테스트로 고정한다(심각성 3·공정함·친구 기준).
 */
export const LANDING_SAMPLES: readonly { story: string; caseType: CaseType; crime: string; order: string }[] = [
  { story: "팀장님이 회의 시작 2분 전에 자료 검토를 요청했어요.", caseType: "work", crime: "회의 직전 자료 요청죄", order: "피고인은 다음 회의부터 자료 요청을 회의 24시간 전까지 완료할 것." },
  { story: "제가 만든 자료를 동료가 자기가 한 것처럼 발표했어요.", caseType: "work", crime: "공로 무단 점유죄", order: "피고인은 가로챈 공로를 원소유자에게 반환하고 전체 메일로 정정할 것." },
  { story: "친구가 약속에 40분 늦고는 사과도 없이 메뉴부터 골랐어요.", caseType: "relationship", crime: "약속 지각죄", order: "피고인은 다음 약속에 원고보다 10분 먼저 도착해 인증 사진을 남길 것." },
  { story: "친구가 빌려간 돈을 다음 달에 갚는다며 석 달째 미뤄요.", caseType: "relationship", crime: "차용금 상환 지연죄", order: "피고인은 본 판결문 수령 즉시 차용금 전액을 상환할 것." },
  { story: "친구가 제 못 나온 사진을 허락도 없이 단체방에 올렸어요.", caseType: "relationship", crime: "굴욕 사진 무단 게시죄", order: "피고인은 해당 게시물을 즉시 삭제하고 보정된 사진으로 대체할 것." },
  { story: "점심 메뉴를 물어보면 동료가 매번 아무거나라고만 해요.", caseType: "meal", crime: "'아무거나' 상습 진술죄", order: "피고인은 향후 1주일간 '아무거나'라는 진술을 하여서는 아니 된다." },
  { story: "친구가 같이 먹는 찌개에 숟가락을 담가 먹어요.", caseType: "meal", crime: "찌개 수저 혼입죄", order: "피고인은 공용 찌개 취식 시 반드시 국자와 앞접시를 경유할 것." },
  { story: "음식이 다 나오기도 전에 친구가 혼자 먹기 시작했어요.", caseType: "meal", crime: "선취식죄", order: "피고인은 전원의 음식이 도착할 때까지 수저 들기를 유보할 것." },
  { story: "단체방에서 내 말만 읽씹하면서 스토리는 꼬박꼬박 올려요.", caseType: "messenger", crime: "읽씹 중 SNS 활동죄", order: "피고인은 SNS 게시 전 미회신 메시지를 우선 처리할 것." },
  { story: "친구가 단체방에 사진을 수십 개 올려서 도배했어요.", caseType: "messenger", crime: "단체방 도배죄", order: "피고인은 도배로 매몰시킨 타인의 공지를 재게시할 것." },
  { story: "친구가 안읽씹해서 숫자 1이 하루 종일 안 없어져요.", caseType: "messenger", crime: "안읽씹 장기 방치죄", order: "피고인은 숫자 1의 소멸 시한을 24시간으로 준수할 것." },
  { story: "친구 몫까지 제 카드로 대신 결제했는데 아직 안 갚아요.", caseType: "money", crime: "대리 결제 대금 미상환죄", order: "피고인은 향후 원고의 선결제 시 당일 자정 전까지 정산을 완료할 것." },
  { story: "모임 회비를 걷어 놓고 총무가 내역을 안 알려 줘요.", caseType: "money", crime: "모임 회비 체납죄", order: "피고인은 향후 회비 고지 수신 후 48시간 내 납부를 완료할 것." },
  { story: "애인이 우리 기념일을 잊어버리고 친구랑 약속을 잡았어요.", caseType: "romance", crime: "기념일 망각죄", order: "피고인은 망각한 기념일을 1주일 내 상응하는 성의로 소급 이행할 것." },
  { story: "썸 타는 사람이 몇 달째 간만 보고 사귀자는 말은 안 해요.", caseType: "romance", crime: "간보기죄", order: "피고인은 2주 내 본건 관계의 정의를 명확한 문장으로 고지할 것." },
  { story: "룸메가 문을 쾅 닫고는 바람이 그런 거라고 우겨요.", caseType: "daily", crime: "문 강타죄", order: "피고인은 감정 표현의 수단으로 문을 사용하지 말 것." },
  { story: "룸메이트가 설거지를 일주일째 미루고 있어요.", caseType: "daily", crime: "공용공간 어지럽힘죄", order: "피고인은 집안일 분담표를 작성하여 냉장고에 게시할 것." },
  { story: "가족이 제 택배를 말도 없이 뜯었어요.", caseType: "daily", crime: "택배 무단 개봉죄", order: "피고인은 수취인 명의가 본인이 아닌 택배의 개봉을 하여서는 아니 된다." },
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** 한국 시간 기준 하루에 한 번 바뀐다 — 화면이 그려진 뒤 예시가 바뀌어 움찔하지 않도록 날짜로 정한다. */
export function landingSample(day = exampleDay()) {
  return LANDING_SAMPLES[hash(`landing|${day}`) % LANDING_SAMPLES.length];
}
