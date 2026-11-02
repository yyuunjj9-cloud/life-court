require('./register-source.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStorage } = require('../src/storage.ts');

test('100 simultaneous reservations are unique; preview never consumes a number', async () => {
  const store = new MemoryStorage();
  assert.equal(await store.nextSeq(), 42);
  assert.equal(await store.nextSeq(), 42);
  const ids = await Promise.all(Array.from({ length: 100 }, () => store.allocateSeq()));
  assert.equal(new Set(ids).size, 100);
  assert.deepEqual(ids, Array.from({ length: 100 }, (_, n) => n + 42));
  assert.equal(await store.nextSeq(), 142);
});
test('only one simultaneous response wins and its value is preserved', async () => {
  const store = new MemoryStorage();
  await store.create({ seq: 42, response: null });
  const results = await Promise.all(Array.from({ length: 100 }, (_, n) => store.setResponse(42, { option: String(n) })));
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal((await store.get(42)).response.option, '0');
  assert.equal(await store.setResponse(999, { option: 'deny' }), false);
});
