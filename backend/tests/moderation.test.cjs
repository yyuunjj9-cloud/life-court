require('./register-source.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkStory } = require('../src/domain/moderation.ts');
for (const story of ['친구가 씨발이라고 하며 저에게 화를 냈어요', '동료가 개.새.끼라는 말을 했습니다', '그 사람은 병\u200b신이라고 말했어요', '친구가 ㅅ ㅂ이라는 욕을 했습니다', '저 집단은 한녀충이라고 부르더군요', '저 병신년 때문에 화났다고 말했어요', '동료가 씨 발이라고 크게 말했어요', '그 사람이 저한테 병.신이라고 했어요']) {
  test('abusive expressions including separators and invisible characters are rejected', () => {
    const issue = checkStory(story); assert.equal(issue?.code, 'abusive_language'); assert.ok(!issue.message.includes(story));
  });
}
for (const story of ['친구 전화번호는 010-1234-5678입니다', '주소는 friend@example.com입니다', '번호는 900101-1234567이라고 합니다', '번호는 ０１０－１２３４－５６７８입니다', '연락처가 010 - 1234 - 5678이라고 했어요']) {
  test('identifying contact formats are rejected', () => assert.equal(checkStory(story)?.code, 'personal_information'));
}
for (const story of ['단체방에서 내 말만 읽씹해서 서운해요', '시발점은 개발 일정이 바뀐 일이었어요', '병신년이라는 연도 이름을 잘못 읽었어요', '친구가 40분 늦었는데 사과하지 않았어요', '친구가 욕설을 해서 기분이 상했습니다', '친구가 죽을 사 왔는데 제 취향은 아니었어요', '한 입만 먹는다더니 세 입이나 먹었어요', '혹시 발송을 놓쳤냐고 친구에게 물었어요', '팀장이 오후 2시 발표인데 자료를 안 줬어요', '택배가 오전 10시 발송 예정이었는데 안 왔어요', '지하철에서 아저씨 발에 걸려 넘어졌는데 사과를 안 했어요', '친구가 요리 솜씨 발휘한다더니 설거지를 저한테 시켰어요', '그 병 신기하게 생겨서 샀는데 친구가 깨뜨렸어요', '아픈 친구를 찾아가서 죽을 사다 줬는데 고맙단 말이 없었어요']) {
  test('ordinary complaints and similar innocent words stay admissible', () => assert.equal(checkStory(story), null));
}
test('specific threats are rejected without blocking ordinary frustration', () => {
  assert.equal(checkStory('찾아가서 죽여버릴 거라고 했어요')?.code, 'violent_threat');
  assert.equal(checkStory('찾아가서 죽여놓겠다고 했어요')?.code, 'violent_threat');
  assert.equal(checkStory('화가 나지만 대화로 해결하려고 했어요'), null);
});
