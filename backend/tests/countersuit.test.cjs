require('./register-source.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateVerdict } = require('../src/domain/judgment.ts');
const {
  COUNTER_ROUNDS, SKIP_ACCEPT_CHANCE, counterNeeded, generateCounterRounds, generateCountersuit, generateCountersuitBrief, scorePicks,
} = require('../src/domain/documents.ts');
const corpus = require('./scenario-corpus.cjs');

const cases = corpus.flatMap(([caseType, story], n) => [1, 3, 5].map((severity) => {
  const input = { story, caseType, relationship: 'friend', severity, tone: 'fair' };
  return { input, verdict: generateVerdict(input, 100 + n) };
}));
const lenient = (verdict) => verdict.result === '무죄' || verdict.result === '훈방 조치';

test('skipping the game keeps the countersuit odds from before the game and leaves no play record', () => {
  assert.deepEqual(SKIP_ACCEPT_CHANCE, [0.7, 0.15]);
  for (const { input, verdict } of cases) {
    const skipped = generateCountersuit(input, verdict);
    assert.equal(skipped.objections, undefined);
    assert.deepEqual(generateCountersuit(input, verdict), skipped);
  }
});

test('a played countersuit is decided by the number of right rebuttals, never by luck', () => {
  for (const { input, verdict } of cases) {
    const needed = counterNeeded(verdict);
    assert.equal(needed, lenient(verdict) ? 3 : 2);
    for (let hits = 0; hits <= COUNTER_ROUNDS; hits++) {
      const doc = generateCountersuit(input, verdict, hits);
      assert.equal(doc.accepted, hits < needed, `hits ${hits}, needed ${needed}`);
      // 인용 여부 외의 문서 내용은 점수와 무관하게 같은 사건에서 같다.
      assert.equal(doc.crime, generateCountersuit(input, verdict, 0).crime);
      assert.equal(doc.facts, generateCountersuit(input, verdict, 0).facts);
    }
  }
});

test('a lost countersuit hands out varied penalties, not always a drink', () => {
  const penalties = new Map();
  for (const { input, verdict } of cases) {
    const doc = generateCountersuit(input, verdict, 0);
    penalties.set(doc.rulingNote, (penalties.get(doc.rulingNote) ?? 0) + 1);
  }
  assert.ok(penalties.size >= 8, [...penalties.keys()].join('\n'));
  const total = [...penalties.values()].reduce((a, b) => a + b, 0);
  const drinks = [...penalties].filter(([note]) => /음료/.test(note)).reduce((a, [, n]) => a + n, 0);
  assert.ok(drinks / total < 0.25, `drink penalties ${drinks}/${total}`);
});

test('every round offers one fitting rebuttal and two that miss, the same for the same case', () => {
  for (const { input, verdict } of cases) {
    const rounds = generateCounterRounds(input, verdict);
    assert.deepEqual(generateCounterRounds(input, verdict), rounds);
    assert.equal(rounds.length, COUNTER_ROUNDS);
    for (const r of rounds) {
      assert.equal(r.options.length, 3);
      assert.equal(new Set(r.options).size, 3);
      assert.ok(r.answer >= 0 && r.answer < 3);
      assert.ok(r.options.every((o) => typeof o === 'string' && o.length > 0));
    }
    const doc = generateCountersuit(input, verdict, 0);
    assert.equal(rounds[1].claim, `피맞고소인은 ${doc.crime}를 범했습니다`);
    assert.ok(doc.facts.endsWith(rounds[2].claim));
    assert.ok(!rounds.some((r) => [r.claim, ...r.options].some((t) => t.includes(input.story))));
    assert.deepEqual(generateCountersuitBrief(input, verdict), rounds.map((r) => r.claim));
  }
});

test('the server scores picks itself and keeps the first right rebuttal as the highlight', () => {
  for (const { input, verdict } of cases.slice(0, 30)) {
    const rounds = generateCounterRounds(input, verdict);
    const right = rounds.map((r) => r.answer);
    const wrong = rounds.map((r) => (r.answer + 1) % 3);
    assert.deepEqual(scorePicks(input, verdict, right), { hits: 3, highlight: rounds[0].options[rounds[0].answer] });
    assert.deepEqual(scorePicks(input, verdict, wrong), { hits: 0, highlight: null });
    const mixed = [wrong[0], right[1], right[2]];
    assert.deepEqual(scorePicks(input, verdict, mixed), { hits: 2, highlight: rounds[1].options[rounds[1].answer] });
    const perfect = generateCountersuit(input, verdict, 3, rounds[0].options[rounds[0].answer]);
    assert.equal(perfect.accepted, false);
    assert.deepEqual(perfect.objections, { hits: 3, total: 3, highlight: rounds[0].options[rounds[0].answer] });
  }
});
