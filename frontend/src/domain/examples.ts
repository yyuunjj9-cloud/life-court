import type { CaseType } from "@/domain/judgment";

/**
 * 사연 입력 화면의 예시 — 실제 접수된 사연이 아니라 직접 쓴 가상의 예문이다.
 * 사건 유형마다 4개씩 두고, 모두 구체적인 죄목으로 판결되는지 테스트로 확인한다.
 */
export const EXAMPLE_STORIES: readonly { type: CaseType; text: string }[] = [
  { type: "work", text: "팀장님이 회의 시작 2분 전에 자료 검토를 요청했어요." },
  { type: "work", text: "퇴근 10분 전에 상사가 급한 일이라며 새 업무를 줬어요." },
  { type: "work", text: "제가 만든 자료를 동료가 자기가 한 것처럼 발표했어요." },
  { type: "work", text: "점심시간에 밥 먹는데 팀장님이 계속 업무 연락을 해요." },
  { type: "relationship", text: "친구가 약속에 40분 늦고는 사과도 없이 메뉴부터 골랐어요." },
  { type: "relationship", text: "친구가 빌려간 돈을 다음 달에 갚는다며 석 달째 미뤄요." },
  { type: "relationship", text: "친구가 제 못 나온 사진을 허락도 없이 단체방에 올렸어요." },
  { type: "relationship", text: "친구가 자기 얘기만 하고 제 말은 끝까지 듣지를 않아요." },
  { type: "meal", text: "점심 메뉴를 물어보면 동료가 매번 아무거나라고만 해요." },
  { type: "meal", text: "친구가 같이 먹는 찌개에 숟가락을 담가 먹어요." },
  { type: "meal", text: "음식이 다 나오기도 전에 친구가 혼자 먹기 시작했어요." },
  { type: "meal", text: "계산할 때만 되면 친구가 화장실에 가서 안 나와요." },
  { type: "messenger", text: "단체방에서 내 말만 읽씹하면서 스토리는 꼬박꼬박 올려요." },
  { type: "messenger", text: "친구가 제 긴 메시지에 ㅇㅇ 한 글자로만 답장했어요." },
  { type: "messenger", text: "친구가 단체방에 사진을 수십 개 올려서 도배했어요." },
  { type: "messenger", text: "친구가 안읽씹해서 숫자 1이 하루 종일 안 없어져요." },
  { type: "money", text: "회식비를 나누는데 술 안 마신 저까지 똑같이 내래요." },
  { type: "money", text: "친구가 거스름돈을 다음에 준다더니 한 달째 소식이 없어요." },
  { type: "money", text: "친구 몫까지 제 카드로 대신 결제했는데 아직 안 갚아요." },
  { type: "money", text: "모임 회비를 걷어 놓고 총무가 내역을 안 알려 줘요." },
  { type: "romance", text: "데이트 중에 애인이 계속 휴대폰만 보고 있었어요." },
  { type: "romance", text: "애인이 우리 기념일을 잊어버리고 친구랑 약속을 잡았어요." },
  { type: "romance", text: "썸 타는 사람이 몇 달째 간만 보고 사귀자는 말은 안 해요." },
  { type: "romance", text: "머리를 잘랐는데 애인이 사흘째 못 알아봐요." },
  { type: "daily", text: "룸메가 문을 쾅 닫고는 바람이 그런 거라고 우겨요." },
  { type: "daily", text: "룸메이트가 설거지를 일주일째 미루고 있어요." },
  { type: "daily", text: "윗집이 새벽마다 쿵쿵거려서 잠을 못 자요." },
  { type: "daily", text: "가족이 제 택배를 말도 없이 뜯었어요." },
];

export const EXAMPLE_COUNT = 4;

/** 한국 시간 기준 오늘 날짜 — 예시가 하루에 한 번 바뀐다. */
export function exampleDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * 같은 날·같은 회차면 같은 예시를 고른다. 서로 다른 사건 유형에서 하나씩 뽑아 다양하게 섞는다.
 * 매번 무작위로 고르면 화면이 그려진 뒤 예시가 한 번 더 바뀌어 화면이 움찔하므로 날짜로 정한다.
 */
export function pickExamples(day: string, round = 0): string[] {
  const types = [...new Set(EXAMPLE_STORIES.map((e) => e.type))];
  const order = types
    .map((t) => ({ t, k: hash(`${day}|${round}|${t}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, EXAMPLE_COUNT);
  return order.map(({ t, k }) => {
    const pool = EXAMPLE_STORIES.filter((e) => e.type === t);
    return pool[k % pool.length].text;
  });
}

/** 예전 고정 예시 — 이걸로 쓰다 저장해 둔 초안도 예시로 보고 잠그지 않는다. */
const LEGACY_EXAMPLES = [
  "팀장님이 회의 시작 2분 전에 자료 검토를 요청했어요. 심지어 본인은 회의에 늦게 들어왔습니다.",
  "친구가 약속에 40분 늦고는 사과도 없이 배고프다며 메뉴부터 골랐어요.",
  "룸메가 문을 쾅 닫고는 자기가 안 그랬고 바람이 그런 거라고 우깁니다.",
  "단체방에서 내 말만 읽씹하면서 스토리는 꼬박꼬박 올라옵니다.",
];

export function isExampleStory(story: string): boolean {
  return EXAMPLE_STORIES.some((e) => e.text === story) || LEGACY_EXAMPLES.includes(story);
}
