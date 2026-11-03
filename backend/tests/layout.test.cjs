const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const css = readFileSync(join(__dirname, '../../frontend/src/app/globals.css'), 'utf8');

test('.pad stays at content height so its bottom padding survives at the end of scroll', () => {
  const rule = css.match(/^\.pad \{[\s\S]*?^\}/m)?.[0];
  assert.ok(rule, '.pad base rule not found');
  assert.match(rule, /flex: 1 0 auto;/);
  assert.doesNotMatch(rule, /min-height: 0;/);
});
