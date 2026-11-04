const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-source.cjs');

const { SCENARIOS, selectScenario, GENERAL_CRIME } = require('../src/domain/judgment.ts');
const { MORE_SCENARIOS } = require('../src/domain/scenarios-more.ts');
const { checkStory } = require('../src/domain/moderation.ts');

const all = Object.values(SCENARIOS).flat();

test('every extension story picks its own scenario, never another specific one', () => {
  // 예시 유사도가 '고소할 일이 아닌 문장'에 가깝다고 보면 일반 분쟁으로 보류할 수 있다.
  // 틀린 구체 죄명보다 보류가 낫다는 원칙(docs/plan-accuracy.md)이므로 보류는 허용하되 1% 이내로 묶는다.
  const corpus = require('./scenario-more-corpus.cjs');
  let held = 0;
  for (const [caseType, story, expected] of corpus) {
    const picked = selectScenario(story, caseType);
    if (picked.crime === GENERAL_CRIME) held += 1;
    // 반복 표현이 없으면 사건명에서 '반복·상습'이 빠지므로 그 차이는 같은 사건으로 본다.
    else assert.equal(picked.name.replace(/\s(?:반복|상습)(?=\s)/g, ''), expected.replace(/\s(?:반복|상습)(?=\s)/g, ''), story);
  }
  assert.ok(held <= corpus.length * 0.01, `보류 ${held}건`);
  // 확장 시나리오마다 확인용 사연이 두 개씩 있다.
  const covered = new Set(require('./scenario-more-corpus.cjs').map(([, , name]) => name));
  for (const scenario of Object.values(MORE_SCENARIOS).flat()) assert.ok(covered.has(scenario.name), scenario.name);
});

test('scenario names and crimes are unique and follow the humor guide format', () => {
  const names = all.map((s) => s.name);
  const crimes = all.map((s) => s.crime);
  assert.equal(new Set(names).size, names.length, 'duplicate scenario name');
  assert.equal(new Set(crimes).size, crimes.length, 'duplicate crime');
  for (const s of all) {
    // 죄명은 한 줄(13자 이내)에 들어가야 캡처된다. 낯선 법률 용어는 죄명에 쓰지 않는다.
    assert.match(s.crime, /죄$/, s.crime);
    assert.ok(s.crime.length <= 13, s.crime);
    assert.doesNotMatch(s.crime, /해태|유치|송달|병합|발포/, s.crime);
    assert.match(s.name, / 사건$/, s.name);
    assert.ok(s.orders.length >= 2, s.name);
    for (const order of s.orders) assert.match(order, /^피고인(은|의) .+\.$/, order);
  }
});

test('extension scenarios pass the intake filter', () => {
  for (const s of Object.values(MORE_SCENARIOS).flat()) {
    for (const text of [s.name, s.crime, ...s.orders, s.defense.claim, s.defense.rejection]) {
      assert.equal(checkStory(text), null, text);
    }
  }
});
