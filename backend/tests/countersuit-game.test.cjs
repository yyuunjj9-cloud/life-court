require('./register-source.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../../frontend/node_modules/react');
const { renderToStaticMarkup } = require('../../frontend/node_modules/react-dom/server');
const { generateVerdict } = require('../src/domain/judgment.ts');
const { generateCountersuit, generateCounterRounds } = require('../src/domain/documents.ts');
const game = require('../../frontend/src/domain/countersuit-game.ts');
const { CountersuitGame } = require('../../frontend/src/components/CountersuitGame.tsx');
const { CountersuitDocView } = require('../../frontend/src/components/LegalDocs.tsx');

const input = { story: '친구가 약속에 40분 늦고는 사과도 없이 메뉴부터 골랐어요', caseType: 'relationship', relationship: 'friend', severity: 3, tone: 'fair' };
const verdict = generateVerdict(input, 57);
const rounds = generateCounterRounds(input, verdict);

test('the screen counts hits the same way the server does and reacts without repeating within a game', () => {
  const right = rounds.map((r) => r.answer);
  assert.equal(game.countHits(rounds, right), 3);
  assert.equal(game.countHits(rounds, right.map((a) => (a + 1) % 3)), 0);
  assert.equal(game.countHits(rounds, [right[0]]), 1);
  for (const right of [true, false]) {
    const lines = [0, 1, 2].map((i) => game.reactionFor(i, right));
    assert.equal(new Set(lines).size, 3);
  }
});

test('the card game opens on round one with the claim, three cards and the judge gauge', () => {
  const markup = renderToStaticMarkup(React.createElement(CountersuitGame, { rounds, needed: 2, onDone() {} }));
  assert.match(markup, /제1라운드/);
  assert.ok(markup.includes(rounds[0].claim));
  assert.equal((markup.match(/class="csg-card"/g) || []).length, 3);
  assert.match(markup, /aria-label="재판부 마음 0칸, 기각까지 2칸 필요"/);
  assert.match(markup, /카드를 골라 주세요/);
});

test('the countersuit document records the card play and its decisive rebuttal only when played', () => {
  const highlight = rounds[1].options[rounds[1].answer];
  const played = renderToStaticMarkup(React.createElement(CountersuitDocView, { doc: generateCountersuit(input, verdict, 2, highlight), date: '2026. 11. 4.' }));
  const text = played.replace(/<!-- -->/g, '');
  assert.match(text, /반박 3회 중 2회 적중<\/p>/);
  assert.ok(text.includes(`결정적 반박: “${highlight}”`));
  const perfect = renderToStaticMarkup(React.createElement(CountersuitDocView, { doc: generateCountersuit(input, verdict, 3), date: '2026. 11. 4.' }));
  assert.match(perfect.replace(/<!-- -->/g, ''), /반박 3회 중 3회 적중 — 완벽 변론/);
  const skipped = renderToStaticMarkup(React.createElement(CountersuitDocView, { doc: generateCountersuit(input, verdict), date: '2026. 11. 4.' }));
  assert.doesNotMatch(skipped, /변 론 기 록/);
});
