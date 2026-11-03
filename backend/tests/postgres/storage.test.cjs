require('../register-source.cjs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const { PgStorage } = require('../../src/storage.ts');
const { generateVerdict } = require('../../src/domain/judgment.ts');
const { generateComplaint, generateCountersuit } = require('../../src/domain/documents.ts');

// Deliberately never fall back to DATABASE_URL or a remote/production database.
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error('TEST_DATABASE_URL is required; this test must not silently skip.');
const target = new URL(connectionString);
if (!['postgres:', 'postgresql:'].includes(target.protocol)
  || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/lifecourt_test') {
  throw new Error('Postgres tests require a loopback database named lifecourt_test. Production connections are refused.');
}
const admin = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5000 });
const pools = new Set();
const schemas = [];
const schemaSql = readFileSync(path.join(__dirname, '../../../db/schema.sql'), 'utf8');
const input = { story: '친구가 약속에 늦어서 한 시간을 기다렸어요', caseType: 'relationship', relationship: 'friend', severity: 3, tone: 'fair' };
function record(seq) {
  const verdict = generateVerdict(input, seq);
  return { seq, input, filingKind: 'complaint', verdict, complaint: generateComplaint(input, verdict, 'complaint'),
    appeal: null, countersuit: null, response: null, shareToken: randomBytes(24).toString('hex'), ownerToken: randomBytes(24).toString('hex') };
}
before(async () => {
  assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'lifecourt_test');
});
after(async () => {
  const closed = await Promise.allSettled([...pools].map(pool => pool.end()));
  try {
    for (const schema of schemas) {
      assert.match(schema, /^lc_test_[a-f0-9]{16}$/);
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
  } finally { await admin.end(); }
  for (const result of closed) if (result.status === 'rejected') throw result.reason;
});
async function fixture(legacy = false) {
  const schema = 'lc_test_' + randomBytes(8).toString('hex');
  await admin.query(`CREATE SCHEMA "${schema}"`);
  schemas.push(schema);
  const openPool = () => {
    const pool = new Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000,
      options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=10000` });
    pools.add(pool); return pool;
  };
  const queryPool = openPool();
  const sql = legacy ? schemaSql
    .replace(/^\s*(response|share_token|owner_token)\s+[^\n]*\n/gm, '')
    .replace(/CREATE TABLE IF NOT EXISTS case_counters\s*\([\s\S]*?\);/g, '') : schemaSql;
  await queryPool.query(sql);
  const openStore = () => { const pool = openPool(); return { pool, store: new PgStorage(pool) }; };
  return { queryPool, openStore };
}

test('preview does not reserve a Postgres number; an empty DB starts at 42', async () => {
  const { queryPool, openStore } = await fixture();
  const { store } = openStore(); await store.ready();
  assert.deepEqual(await Promise.all(Array.from({ length: 20 }, () => store.nextSeq())), Array(20).fill(42));
  assert.equal((await queryPool.query('SELECT COUNT(*)::int AS count FROM case_counters')).rows[0].count, 0);
  assert.equal(await store.allocateSeq(), 42);
  assert.equal(await store.nextSeq(), 43);
});

test('120 parallel inserts across three Postgres pools never collide or overwrite', async () => {
  const { queryPool, openStore } = await fixture();
  const workers = Array.from({ length: 3 }, openStore);
  await Promise.all(workers.map(worker => worker.store.ready()));
  const clients = await Promise.all(workers.map(worker => worker.pool.connect()));
  try {
    const pids = await Promise.all(clients.map(client => client.query('SELECT pg_backend_pid() AS pid')));
    assert.equal(new Set(pids.map(result => result.rows[0].pid)).size, 3);
  } finally { clients.forEach(client => client.release()); }
  const seqs = await Promise.all(Array.from({ length: 120 }, async (_, n) => {
    const store = workers[n % workers.length].store;
    const seq = await store.allocateSeq();
    await new Promise(setImmediate);
    await store.create(record(seq));
    return seq;
  }));
  assert.equal(new Set(seqs).size, 120);
  assert.deepEqual([...seqs].sort((a, b) => a - b), Array.from({ length: 120 }, (_, n) => 42 + n));
  assert.deepEqual((await queryPool.query('SELECT COUNT(*)::int AS count, COUNT(DISTINCT seq)::int AS unique_count FROM cases')).rows[0], { count: 120, unique_count: 120 });
  assert.equal(await workers[0].store.nextSeq(), 162);
});

test('100 concurrent Postgres responses have exactly one winner, preserved on every connection', async () => {
  const { openStore } = await fixture();
  const workers = Array.from({ length: 3 }, openStore);
  await Promise.all(workers.map(worker => worker.store.ready()));
  const seq = await workers[0].store.allocateSeq();
  const original = record(seq); await workers[0].store.create(original);
  const results = await Promise.all(Array.from({ length: 100 }, async (_, n) => {
    const response = { option: n % 2 ? 'deny' : 'apologize' };
    return { accepted: await workers[n % 3].store.setResponse(seq, response), response };
  }));
  const winners = results.filter(result => result.accepted);
  assert.equal(winners.length, 1);
  for (const { store } of workers) {
    assert.deepEqual((await store.get(seq)).response, winners[0].response);
    assert.deepEqual((await store.get(seq)).verdict, original.verdict);
    assert.equal(await store.setResponse(seq, { option: 'counter' }), false);
    assert.equal(await store.setResponse(99999, { option: 'deny' }), false);
  }
});

test('concurrent Postgres countersuits store exactly one document without touching the verdict', async () => {
  const { openStore } = await fixture();
  const workers = Array.from({ length: 3 }, openStore);
  await Promise.all(workers.map(worker => worker.store.ready()));
  const seq = await workers[0].store.allocateSeq();
  const original = record(seq); await workers[0].store.create(original);
  const results = await Promise.all(Array.from({ length: 30 }, async (_, n) => {
    const doc = generateCountersuit(input, original.verdict, n % 4);
    return { accepted: await workers[n % 3].store.setCountersuit(seq, doc), doc };
  }));
  const winners = results.filter(result => result.accepted);
  assert.equal(winners.length, 1);
  for (const { store } of workers) {
    const stored = await store.get(seq);
    assert.deepEqual(stored.countersuit, winners[0].doc);
    assert.deepEqual(stored.verdict, original.verdict);
    assert.equal(await store.setCountersuit(seq, winners[0].doc), false);
  }
});

test('unfilled reservations remain durable after closing and reopening Postgres connections', async () => {
  const { openStore } = await fixture();
  const first = openStore(); await first.store.ready();
  assert.equal(await first.store.allocateSeq(), 42);
  assert.equal(await first.store.allocateSeq(), 43);
  await first.pool.end(); pools.delete(first.pool);
  const restarted = openStore(); await restarted.store.ready();
  assert.equal(await restarted.store.nextSeq(), 44);
  assert.equal(await restarted.store.allocateSeq(), 44);
});

test('three instances migrate a legacy schema concurrently while preserving existing documents', async () => {
  const { queryPool, openStore } = await fixture(true);
  const old = record(90);
  await queryPool.query(`INSERT INTO cases (seq, case_no, story, case_type, relationship, severity, tone, filing_kind, verdict, complaint)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
  [old.seq, old.verdict.caseNo, input.story, input.caseType, input.relationship, input.severity, input.tone, old.filingKind, JSON.stringify(old.verdict), JSON.stringify(old.complaint)]);
  const workers = Array.from({ length: 3 }, openStore);
  await Promise.all(workers.map(worker => worker.store.ready()));
  const stored = await workers[0].store.get(90);
  assert.deepEqual(stored.verdict, old.verdict);
  assert.deepEqual(stored.complaint, old.complaint);
  assert.equal(stored.ownerToken, null);
  assert.equal(stored.shareToken, null);
  assert.deepEqual((await Promise.all(workers.map(worker => worker.store.allocateSeq()))).sort((a, b) => a - b), [91, 92, 93]);
});
