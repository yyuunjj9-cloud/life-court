require('./register-source.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateVerdict } = require('../src/domain/judgment.ts');
const { COUNTER_ACCEPT_CHANCE, COUNTER_ROUNDS, generateCountersuit, generateCountersuitBrief } = require('../src/domain/documents.ts');
const corpus = require('./scenario-corpus.cjs');

const cases = corpus.flatMap(([caseType, story], n) => [1, 3, 5].map((severity) => {
  const input = { story, caseType, relationship: 'friend', severity, tone: 'fair' };
  return { input, verdict: generateVerdict(input, 100 + n) };
}));

test('skipping the game keeps the countersuit odds and documents from before the game', () => {
  assert.deepEqual(COUNTER_ACCEPT_CHANCE[1], [0.7, 0.15]);
  for (const { input, verdict } of cases) {
    const skipped = generateCountersuit(input, verdict);
    assert.equal(skipped.objections, undefined);
    const { objections, ...played } = generateCountersuit(input, verdict, 1);
    assert.deepEqual(objections, { hits: 1, total: COUNTER_ROUNDS });
    assert.deepEqual(played, skipped);
  }
});

test('blocking more objections never makes a countersuit succeed, and the same play gives the same result', () => {
  let changed = 0;
  for (const { input, verdict } of cases) {
    const results = [0, 1, 2, 3].map((hits) => generateCountersuit(input, verdict, hits));
    assert.deepEqual(generateCountersuit(input, verdict, 2), results[2]);
    for (let hits = 1; hits <= 3; hits++) {
      if (results[hits].accepted) assert.ok(results[hits - 1].accepted, 'more hits must not turn a dismissal into acceptance');
      // 인용 여부 외의 문서 내용은 점수와 무관하게 같은 사건에서 같다.
      assert.equal(results[hits].crime, results[0].crime);
      assert.equal(results[hits].facts, results[0].facts);
    }
    if (results[0].accepted !== results[3].accepted) changed++;
  }
  assert.ok(changed > 0, 'the score should change some outcomes');
  for (const row of COUNTER_ACCEPT_CHANCE) assert.ok(row[0] > row[1]);
  for (let hits = 1; hits <= 3; hits++) {
    assert.ok(COUNTER_ACCEPT_CHANCE[hits][0] < COUNTER_ACCEPT_CHANCE[hits - 1][0]);
    assert.ok(COUNTER_ACCEPT_CHANCE[hits][1] < COUNTER_ACCEPT_CHANCE[hits - 1][1]);
  }
});

test('the game lines match the countersuit document and never quote the story', () => {
  for (const { input, verdict } of cases) {
    const lines = generateCountersuitBrief(input, verdict);
    const doc = generateCountersuit(input, verdict, 0);
    assert.equal(lines.length, COUNTER_ROUNDS);
    assert.ok(lines.every((line) => typeof line === 'string' && line.length > 0));
    assert.equal(lines[1], `피맞고소인은 ${doc.crime}를 범했습니다`);
    assert.ok(doc.facts.endsWith(lines[2]));
    assert.ok(!lines.some((line) => line.includes(input.story)));
  }
});

