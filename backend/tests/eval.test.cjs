const test = require('node:test');
const assert = require('node:assert/strict');

const { score } = require('../scripts/eval-matching.cjs');

// 개발용 시험지(조정용+확인용 746문항) 기준선. 분류 규칙을 바꿀 때 이보다 나빠지면 실패한다.
// 두 묶음 모두 기준값 조정에 썼으므로 합쳐서 본다. 실제 성능은 봉인 시험지(holdout*)로만 보고한다.
// 나아지면 숫자를 새 결과로 올린다(docs/plan-accuracy.md의 기록 표도 함께 고친다).
const BASELINE = { wrongRate: 8.3, hitRate: 77.8 };

test('development eval set: wrong-answer rate and hit rate do not regress', () => {
  const s = score('all');
  assert.ok(s.wrongRate <= BASELINE.wrongRate, `오답률 ${s.wrongRate}% > 기준 ${BASELINE.wrongRate}%`);
  assert.ok(s.hitRate >= BASELINE.hitRate, `적중률 ${s.hitRate}% < 기준 ${BASELINE.hitRate}%`);
});
