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
  assert.equal(ids.length, 12);
  assert.equal(new Set(ids).size, 12);
  assert.equal((markup.match(/textLength="205"/g) || []).length, 8);
});
