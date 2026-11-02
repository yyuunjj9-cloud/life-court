/** Conservative, local intake rules. Rejected text is never stored or echoed. */
export interface ModerationIssue {
  code: "abusive_language" | "personal_information" | "violent_threat";
  message: string;
}

export function checkStory(story: string): ModerationIssue | null {
  const normalized = story.normalize("NFKC").toLowerCase()
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "");
  if (/(?:^|\D)(?:01[016789]|\+82[ .-]?10)[ .-]?\d{3,4}[ .-]?\d{4}(?!\d)/.test(normalized)
    || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(normalized)
    || /(?:^|\D)\d{6}\s*-\s*[1-8]\d{6}(?!\d)/.test(normalized)) {
    return { code: "personal_information", message: "전화번호·이메일·주민등록번호로 보이는 정보가 포함되어 있습니다. 해당 정보를 지우고 ‘동료’, ‘친구’처럼 관계로 적어주세요." };
  }
  const compact = normalized.replace(/[\s\p{P}\p{S}]/gu, "")
    .replace(/병신년(?=이라는연도|은육십갑자|은2016)/g, "");
  const prohibited = ["씨발", "씨팔", "개새끼", "개색끼", "병신", "좆", "ㅅㅂ", "ㅂㅅ", "한남충", "한녀충", "짱깨", "쪽바리", "깜둥이"];
  const ambiguousProfanity = /(?:^|[^가-힣])시[\s\p{P}\p{S}]*발(?![\s\p{P}\p{S}]*(?:점|역|지))/u.test(normalized);
  if (ambiguousProfanity || prohibited.some(word => compact.includes(word.normalize("NFKC")))) {
    return { code: "abusive_language", message: "욕설이나 상대·집단을 비하하는 표현이 포함되어 있습니다. 해당 표현을 빼고, 상대가 어떤 행동을 했는지 중심으로 다시 적어주세요." };
  }
  if (/죽여버리겠|죽여버릴거|찾아가서죽|칼로찔러버|패죽이겠/.test(compact)) {
    return { code: "violent_threat", message: "직접적인 위해·위협 표현이 포함되어 있습니다. 이곳은 사소한 생활 분쟁을 다루는 가상 법정입니다. 위협 표현을 지우고 있었던 일을 중심으로 적어주세요." };
  }
  return null;
}
