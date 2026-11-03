require('./register-source.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../../frontend/node_modules/react');
const { renderToStaticMarkup } = require('../../frontend/node_modules/react-dom/server');
const { Burst } = require('../../frontend/src/components/Burst.tsx');
test('four callouts provide distinct, accessible palettes without clipping long English text', () => {
  const variants = [['objection', 'Objection!'], ['overruled', 'Overruled!'], ['sustained', 'Sustained!'], ['dismissed', 'Case dismissed!']];
  const markup = renderToStaticMarkup(React.createElement('div', null, ...variants.map(([variant, text]) => React.createElement(Burst, { variant, text, key: variant }))));
  for (const [, text] of variants) assert.ok(markup.includes(text));
  const ids = [...markup.matchAll(/<linearGradient id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 8);
  assert.equal(new Set(ids).size, 8);
  assert.equal((markup.match(/textLength="192"/g) || []).length, 8);
});
test('callout letters stay colored and uncramped on phones without Impact', () => {
  const markup = renderToStaticMarkup(React.createElement(Burst, { variant: 'dismissed', text: 'Case dismissed!' }));
  // 글자는 그라데이션 연결 없이 단색 — 연결이 끊기면 크림 외곽선만 남아 흰 글자처럼 보였다.
  assert.doesNotMatch(markup, /<text[^>]*fill="url\(/);
  assert.match(markup, /<text[^>]*fill="#514133"/);
  // 배경 그라데이션도 연결이 끊기면 대체 색으로 칠해진다.
  assert.match(markup, /fill="url\(#[^)]+-red\) #44382E"/);
  // 앱이 제공하는 Anton을 먼저 쓰고, 긴 외침은 작게 써서 눌리지 않게 한다.
  assert.match(markup, /font-family:var\(--font-burst-latin\)/);
  const size = (text) => Number(renderToStaticMarkup(React.createElement(Burst, { text })).match(/font-size="(\d+)"/)[1]);
  assert.ok(size('Case dismissed!') < size('Objection!'));
});
test('intake rejection has a distinct calm variant and accessible Korean meaning', () => {
  const markup = renderToStaticMarkup(React.createElement(Burst, { text: 'Inadmissible!', variant: 'inadmissible' }));
  assert.match(markup, /진술 보완 요청/);
  assert.match(markup, /PLEASE REPHRASE/);
  assert.match(markup, /#775429/);
});
