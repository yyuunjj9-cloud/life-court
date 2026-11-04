const test = require('node:test');
const assert = require('node:assert/strict');

const { score } = require('../scripts/eval-matching.cjs');

// 시험지 최종 확인용(test) 기준선. 분류 규칙을 바꿀 때 이보다 나빠지면 실패한다.
// 나아지면 숫자를 새 결과로 올린다(docs/plan-accuracy.md의 기록 표도 함께 고친다).
const BASELINE = { wrongRate: 22.4, hitRate: 45.5 };

test('blind eval set: wrong-answer rate and hit rate do not regress', () => {
  const s = score('test');
  assert.ok(s.wrongRate <= BASELINE.wrongRate, `오답률 ${s.wrongRate}% > 기준 ${BASELINE.wrongRate}%`);
  assert.ok(s.hitRate >= BASELINE.hitRate, `적중률 ${s.hitRate}% < 기준 ${BASELINE.hitRate}%`);
});
