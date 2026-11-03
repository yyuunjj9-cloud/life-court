require('./register-source.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../../frontend/node_modules/react');
const { renderToStaticMarkup } = require('../../frontend/node_modules/react-dom/server');
const { generateVerdict } = require('../src/domain/judgment.ts');
const { generateCountersuit, generateCountersuitBrief } = require('../src/domain/documents.ts');
const game = require('../../frontend/src/domain/countersuit-game.ts');
const { CountersuitGame } = require('../../frontend/src/components/CountersuitGame.tsx');
const { CountersuitDocView } = require('../../frontend/src/components/LegalDocs.tsx');
const corpus = require('./scenario-corpus.cjs');

const cases = corpus.flatMap(([caseType, story], n) => [1, 3, 5].map((severity) => {
  const input = { story, caseType, relationship: 'friend', severity, tone: 'fair' };
  return { input, verdict: generateVerdict(input, 100 + n) };
}));

test('a press is early before the red tail, a hit inside the window, and a miss after it', () => {
  assert.deepEqual(game.ROUND_WINDOWS_MS, [1000, 800, 600]);
  const redAt = game.typingDuration('피맞고소인은 과잉 고소죄를 범했습니다');
  for (const [round, windowMs] of game.ROUND_WINDOWS_MS.entries()) {
    assert.equal(game.judgePress(redAt - 1, redAt, windowMs), 'early', `round ${round + 1}`);
    assert.equal(game.judgePress(redAt, redAt, windowMs), 'hit');
    assert.equal(game.judgePress(redAt + windowMs, redAt, windowMs), 'hit');
    assert.equal(game.judgePress(redAt + windowMs + 1, redAt, windowMs), 'miss');
    assert.equal(game.judgePress(null, redAt, windowMs), 'miss');
  }
  assert.equal(game.typingDuration('짧은 문장'), 5 * game.CHAR_MS);
  assert.equal(game.typingDuration('가'.repeat(200)), game.TYPE_MAX_MS);
});

test('the red tail is the last words of each line, never cut mid-word', () => {
  assert.equal('한숨은 비염 때문이었다'.slice(game.redTailStart('한숨은 비염 때문이었다')), '때문이었다');
  assert.equal('피맞고소인은 과잉 고소죄를 범했습니다'.slice(game.redTailStart('피맞고소인은 과잉 고소죄를 범했습니다')), '범했습니다');
  assert.equal('그냥 잊은 줄 알았다'.slice(game.redTailStart('그냥 잊은 줄 알았다')), '줄 알았다');
  assert.equal('자연스러워서 올렸다'.slice(game.redTailStart('자연스러워서 올렸다')), '올렸다');
  for (const { input, verdict } of cases) {
    for (const line of generateCountersuitBrief(input, verdict)) {
      const start = game.redTailStart(line);
      assert.ok(start > 0, line);
      assert.equal(line[start - 1], ' ', line);
    }
  }
});

test('the game opens on round one and the document shows the play record only when played', () => {
  const markup = renderToStaticMarkup(React.createElement(CountersuitGame, { lines: ['가 나 다라마바', '라 마 바사아자', '사 아 자차카타'], onDone() {} }));
  assert.match(markup, /제1라운드/);
  assert.match(markup, /이의 있음!/);
  assert.match(markup, /aria-label="이의 인용 0회"/);
  const { input, verdict } = cases[0];
  const played = renderToStaticMarkup(React.createElement(CountersuitDocView, { doc: generateCountersuit(input, verdict, 2), date: '2026. 11. 3.' }));
  assert.match(played.replace(/<!-- -->/g, ''), /이의 제기 3회 중 2회 인용/);
  const skipped = renderToStaticMarkup(React.createElement(CountersuitDocView, { doc: generateCountersuit(input, verdict), date: '2026. 11. 3.' }));
  assert.doesNotMatch(skipped, /변 론 기 록/);
});
