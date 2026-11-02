const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');
let child, base;
before(async () => {
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer(); server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['-r', path.join(__dirname, 'register-source.cjs'), path.join(__dirname, '../src/index.ts')], {
    env: { ...process.env, DATABASE_URL: '', PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Test API failed to start')), 10000);
    child.once('error', reject); child.once('exit', code => { clearTimeout(timer); reject(new Error(`API exited: ${code}`)); });
    child.stdout.on('data', chunk => { if (chunk.toString().includes('API listening')) { clearTimeout(timer); resolve(); } });
  });
});
after(() => child?.kill());
const post = (url, body, headers = {}) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const data = { story: '상사가 주말에 업무 보고를 하라고 연락했어요', caseType: 'work', relationship: 'boss', severity: 3, tone: 'fair', filingKind: 'complaint' };

test('concurrent creation assigns unique cases and independent secure tokens', async () => {
  const responses = await Promise.all(Array.from({ length: 30 }, () => post('/api/cases', data)));
  assert.ok(responses.every(r => r.status === 201));
  const records = await Promise.all(responses.map(r => r.json()));
  assert.equal(new Set(records.map(r => r.seq)).size, 30);
  assert.equal(new Set(records.flatMap(r => [r.ownerToken, r.shareToken])).size, 60);
  for (const record of records) {
    assert.match(record.ownerToken, /^[a-f0-9]{48}$/); assert.match(record.shareToken, /^[a-f0-9]{48}$/);
  }
});
test('share token grants only public fields and defense; owner token alone grants mutations', async () => {
  const created = await (await post('/api/cases', data)).json();
  const { seq, shareToken, ownerToken } = created;
  assert.equal((await fetch(`${base}/api/cases/${seq}`)).status, 403);
  assert.equal((await fetch(`${base}/api/cases/${seq}?t=${ownerToken}`)).status, 403);
  const shared = await fetch(`${base}/api/cases/${seq}?t=${shareToken}`);
  assert.equal(shared.headers.get('cache-control'), 'no-store');
  const record = await shared.json();
  assert.deepEqual(Object.keys(record).sort(), ['responseDoc', 'seq', 'verdict']);
  for (const action of ['appeal', 'countersuit']) {
    assert.equal((await post(`/api/cases/${seq}/${action}`, {})).status, 403);
    assert.equal((await post(`/api/cases/${seq}/${action}`, {}, { 'X-Owner-Token': shareToken })).status, 403);
    assert.equal((await post(`/api/cases/${seq}/${action}`, {}, { 'X-Owner-Token': ownerToken })).status, 200);
  }
  assert.equal((await post(`/api/cases/${seq}/response`, { t: ownerToken, option: 'deny' })).status, 403);
  assert.equal((await post(`/api/cases/${seq}/response`, { t: shareToken, option: 'bad-option' })).status, 400);
  const results = await Promise.all(Array.from({ length: 30 }, (_, n) => post(`/api/cases/${seq}/response`, { t: shareToken, option: n % 2 ? 'deny' : 'apologize' })));
  assert.equal(results.filter(r => r.status === 201).length, 1);
  assert.equal(results.filter(r => r.status === 409).length, 29);
  const winner = await results.find(r => r.status === 201).json();
  const reread = await (await fetch(`${base}/api/cases/${seq}?t=${shareToken}`)).json();
  assert.deepEqual(reread.responseDoc, winner.responseDoc);
  assert.deepEqual(reread.verdict, created.verdict);
});
