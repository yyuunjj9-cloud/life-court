const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const source = (file) => readFileSync(join(__dirname, '../../frontend/src', file), 'utf8');
const css = source('app/globals.css');

test('.pad stays at content height so its bottom padding survives at the end of scroll', () => {
  const rule = css.match(/^\.pad \{[\s\S]*?^\}/m)?.[0];
  assert.ok(rule, '.pad base rule not found');
  assert.match(rule, /flex: 1 0 auto;/);
  assert.doesNotMatch(rule, /min-height: 0;/);
});

test('the simulated countersuit says so, and the expansion teaser stays after the verdict', () => {
  assert.match(source('components/LegalDocs.tsx'), /가상 연출이며 상대방에게 전달되지 않습니다/);
  assert.match(source('app/verdict/page.tsx'), /가상의 피고가/);
  const teaser = '피고 본인 출석이 허용될 예정';
  assert.ok(source('app/countersuit/page.tsx').includes(teaser));
  for (const page of ['app/page.tsx', 'app/invite/page.tsx']) assert.ok(!source(page).includes(teaser));
});
