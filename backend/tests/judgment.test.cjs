const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
// Exercise source without generated build artifacts or a runtime loader service.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText, filename);
const { selectScenario, generateVerdict } = require('../src/domain/judgment.ts');
const { generateComplaint, generateDemandLetter } = require('../src/domain/documents.ts');
const input = (story, extra = {}) => ({ story, caseType: 'daily', relationship: 'friend', severity: 3, tone: 'fair', ...extra });

for (const [caseType, story, expected] of require('./scenario-corpus.cjs')) {
  test(`corpus: ${story}`, () => {
    const data = input(story, { caseType });
    const scenario = selectScenario(story, caseType);
    if (expected) assert.equal(scenario.name, expected);
    else assert.equal(scenario.keywords.length, 0);
    const verdict = generateVerdict(data, 42);
    assert.equal(verdict.crime, scenario.crime);
    assert.equal(generateComplaint(data, verdict, 'complaint').crime, scenario.crime);
    assert.ok(generateDemandLetter(data).title.includes(scenario.name));
  });
}

test('specific facts can select a scenario outside the selected category', () => {
  assert.match(selectScenario('상사가 주말에 카톡으로 업무를 지시했어요', 'daily').name, /휴일 업무/);
  assert.match(selectScenario('친구가 안읽씹해서 숫자 1이 안 없어져요', 'messenger').name, /안읽씹/);
});
test('unknown facts never receive a randomly invented specific offense', () => {
  const scenario = selectScenario('친구 때문에 마음이 불편해서 판단을 받고 싶어요', 'daily');
  assert.match(scenario.name, /일상 분쟁/);
  assert.match(scenario.crime, /생활 배려/);
});
test('all generated documents use the same scenario', () => {
  const data = input('상사가 주말에 카톡으로 업무를 지시했어요');
  const verdict = generateVerdict(data, 42);
  assert.equal(generateComplaint(data, verdict, 'complaint').crime, verdict.crime);
  assert.ok(generateDemandLetter(data).title.includes(verdict.caseName));
  assert.match(verdict.advice, /휴일|주말|공휴일/);
  assert.doesNotMatch(verdict.reasoning, /피고인은 ".*"라고 항변/);
});
test('normalization and overlapping keywords do not favor generic scenarios', () => {
  assert.match(selectScenario('친구가 안 읽 씹 해서 숫자 1이 안 없어져요', 'daily').name, /안읽씹/);
  assert.match(selectScenario('내가 보낸 답장은 읽씹하면서 SNS에는 좋아요를 눌러요', 'relationship').name, /SNS/);
  assert.match(selectScenario('새벽에 준비하면서 친구 대신 의견을 냈어요', 'daily').name, /분쟁/);
});
test('insufficient facts cannot lead to a conviction even in strict mode', () => {
  const verdict = generateVerdict(input('친구 때문에 마음이 불편해서 판단을 받고 싶어요', { severity: 5, tone: 'strict' }), 42);
  assert.ok(['무죄', '훈방 조치'].includes(verdict.result));
  assert.match(verdict.reasoning, /단정하지/);
});
test('a single incident is not labeled habitual without a recurrence statement', () => {
  const single = selectScenario('친구가 약속 시간에 늦어서 한 시간을 기다렸어요', 'relationship');
  assert.doesNotMatch(single.name + single.crime, /반복|상습/);
  const repeated = selectScenario('친구가 매번 약속 시간에 늦어서 계속 기다립니다', 'relationship');
  assert.match(repeated.name + repeated.crime, /반복|상습/);
});
test('default settings no longer produce only conditional convictions', () => {
  const results = new Set(Array.from({ length: 80 }, (_, n) => generateVerdict(input(`친구가 약속에 늦어서 ${n}분을 기다렸어요`), 42).result));
  assert.ok(results.size >= 3, [...results].join(', '));
});
test('same input stays deterministic; tone and severity remain monotonic', () => {
  const ranks = ['무죄', '훈방 조치', '조건부 유죄', '유죄', '괘씸죄 가중 유죄'];
  for (let n = 0; n < 40; n++) {
    const data = input(`친구가 약속에 늦어서 ${n}분을 기다렸어요`);
    assert.deepEqual(generateVerdict(data, 42), generateVerdict(data, 42));
    for (const field of ['tone', 'severity']) {
      const values = field === 'tone' ? ['lenient', 'fair', 'strict'] : [1, 2, 3, 4, 5];
      const scores = values.map(value => ranks.indexOf(generateVerdict({ ...data, [field]: value }, 42).result));
      assert.deepEqual(scores, [...scores].sort((a, b) => a - b));
    }
  }
});
