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
test('a supreme appeal waits for the appeal and is stored once', async () => {
  const store = new MemoryStorage();
  await store.create({ seq: 42, appeal: null, supreme: null });
  assert.equal(await store.setSupreme(42, { order: 'x' }), false);
  await store.update(42, { appeal: { order: 'a' } });
  const results = await Promise.all(Array.from({ length: 10 }, (_, n) => store.setSupreme(42, { order: String(n) })));
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal((await store.get(42)).supreme.order, '0');
});
test('a juror device counts once per case', async () => {
  const store = new MemoryStorage();
  const results = await Promise.all(Array.from({ length: 5 }, () => store.addJuryVote(42, 'a'.repeat(32), 'guilty')));
  assert.equal(results.filter(Boolean).length, 1);
  await store.addJuryVote(42, 'b'.repeat(32), 'not_guilty');
  await store.addJuryVote(43, 'a'.repeat(32), 'not_guilty');
  assert.deepEqual(await store.juryTally(42, 'a'.repeat(32)), { guilty: 1, notGuilty: 1, mine: 'guilty' });
  assert.deepEqual(await store.juryTally(42), { guilty: 1, notGuilty: 1, mine: null });
  assert.deepEqual((await store.usageStats()).jury, { votes: 3, cases: 2 });
});
test('only one simultaneous countersuit is stored', async () => {
  const store = new MemoryStorage();
  await store.create({ seq: 42, countersuit: null });
  const results = await Promise.all(Array.from({ length: 10 }, (_, n) => store.setCountersuit(42, { crime: String(n) })));
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal((await store.get(42)).countersuit.crime, '0');
  assert.equal(await store.setCountersuit(999, { crime: 'x' }), false);
});
