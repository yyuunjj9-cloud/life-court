require('./register-source.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shortShareId, parseShortShareId } = require('../../frontend/src/lib/share.ts');
test('random share token survives URL formatting and parsing', () => {
  const token = 'a1'.repeat(24);
  assert.deepEqual(parseShortShareId(shortShareId(42, token)), { seq: 42, token });
});
test('weak legacy tokens and malformed identifiers are rejected', () => {
  for (const value of ['42-769v8b', '0-' + 'a'.repeat(48), '42-' + 'a'.repeat(47), '../42-' + 'a'.repeat(48)]) {
    assert.equal(parseShortShareId(value), null);
  }
  assert.throws(() => shortShareId(42, 'a story instead of a token'));
});
