const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');
let child, base;
// 테스트 서버 전용 운영자 열쇠 — 운영 열쇠와 무관하다.
const ADMIN = 'ad'.repeat(24);
before(async () => {
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer(); server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['-r', path.join(__dirname, 'register-source.cjs'), path.join(__dirname, '../src/index.ts')], {
    env: { ...process.env, DATABASE_URL: '', PORT: String(port), ADMIN_TOKEN_SHA256: require('node:crypto').createHash('sha256').update(ADMIN).digest('hex') },
    stdio: ['ignore', 'pipe', 'pipe'],
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

test('offense preview lists crimes for every case type', async () => {
  const res = await fetch(`${base}/api/meta/offenses`);
  assert.equal(res.status, 200);
  const { offenses } = await res.json();
  for (const type of ['work', 'relationship', 'meal', 'messenger', 'money', 'romance', 'daily']) {
    assert.ok(Array.isArray(offenses[type]) && offenses[type].length >= 5, `missing offenses for ${type}`);
  }
});

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
test('the countersuit game reads lines without filing, then stores one result for concurrent plays', async () => {
  const { seq, shareToken, ownerToken } = await (await post('/api/cases', data)).json();
  const brief = (token) => fetch(`${base}/api/cases/${seq}/countersuit/brief`, token ? { headers: { 'X-Owner-Token': token } } : {});
  for (const token of [undefined, shareToken]) {
    const denied = await brief(token);
    assert.equal(denied.status, 403);
    assert.ok(!('lines' in await denied.json()));
  }
  const first = await brief(ownerToken);
  assert.equal(first.headers.get('cache-control'), 'no-store');
  const { lines, rounds, needed, done } = await first.json();
  assert.equal(lines.length, 3);
  assert.equal(rounds.length, 3);
  assert.ok(rounds.every(r => r.options.length === 3 && Number.isInteger(r.answer)));
  assert.ok(needed === 2 || needed === 3);
  assert.equal(done, undefined);
  // 문장만 읽고 떠나면 맞고소가 접수되지 않는다.
  assert.equal((await (await brief(ownerToken)).json()).done, undefined);
  const owner = { 'X-Owner-Token': ownerToken };
  for (const body of [{ hits: 4 }, { hits: -1 }, { hits: 1.5 }, { hits: '1' }, { hits: null }, { hits: true },
    { picks: [0, 1] }, { picks: [0, 1, 3] }, { picks: [0, 1, '2'] }, { picks: 'abc' }, { picks: [0, 0, 0], hits: 1 }]) {
    assert.equal((await post(`/api/cases/${seq}/countersuit`, body, owner)).status, 400, JSON.stringify(body));
  }
  assert.equal((await post(`/api/cases/${seq}/countersuit`, { picks: [0, 0, 0] }, { 'X-Owner-Token': shareToken })).status, 403);
  // 맞힌 수는 서버가 고른 카드로 다시 계산한다 — 모두 맞히면 기각되고 결정적 반박이 남는다.
  const right = rounds.map(r => r.answer);
  const plays = await Promise.all(Array.from({ length: 10 }, (_, n) =>
    post(`/api/cases/${seq}/countersuit`, n === 0 ? { picks: right } : { picks: rounds.map(r => (r.answer + 1) % 3) }, owner)));
  assert.ok(plays.every(r => r.status === 200));
  const docs = await Promise.all(plays.map(r => r.json()));
  for (const doc of docs) assert.deepEqual(doc, docs[0]);
  assert.ok(Number.isInteger(docs[0].countersuit.objections.hits));
  assert.deepEqual(await (await post(`/api/cases/${seq}/countersuit`, {}, owner)).json(), docs[0]);
  assert.equal((await (await brief(ownerToken)).json()).done, true);
});
test('a supreme appeal is optional, needs the appeal first, and stores one result', async () => {
  const { seq, shareToken, ownerToken } = await (await post('/api/cases', data)).json();
  const owner = { 'X-Owner-Token': ownerToken };
  assert.equal((await post(`/api/cases/${seq}/supreme`, {}, owner)).status, 409);
  assert.equal((await post(`/api/cases/${seq}/appeal`, {}, owner)).status, 200);
  assert.equal((await post(`/api/cases/${seq}/supreme`, {})).status, 403);
  assert.equal((await post(`/api/cases/${seq}/supreme`, {}, { 'X-Owner-Token': shareToken })).status, 403);
  const plays = await Promise.all(Array.from({ length: 10 }, () => post(`/api/cases/${seq}/supreme`, {}, owner)));
  assert.ok(plays.every(r => r.status === 200));
  const docs = await Promise.all(plays.map(r => r.json()));
  for (const doc of docs) assert.deepEqual(doc, docs[0]);
  assert.match(docs[0].supreme.order, /판결 확정\.$/);
  // 공유 링크로는 상고심이 보이지 않는다 — 공개 범위는 그대로다.
  const shared = await (await fetch(`${base}/api/cases/${seq}?t=${shareToken}`)).json();
  assert.deepEqual(Object.keys(shared).sort(), ['responseDoc', 'seq', 'verdict']);
});
test('memo-board ideas stay hidden until the operator approves, and private ones never show', async () => {
  const from = (ip) => ({ 'X-Forwarded-For': ip });
  const publicIdea = await post('/api/ideas', { text: '피고도 항소하게 해 주세요', public: true }, from('10.0.0.1'));
  assert.equal(publicIdea.status, 201);
  assert.deepEqual(await publicIdea.json(), { status: 'pending' });
  assert.deepEqual(await (await post('/api/ideas', { text: '운영자님만 보세요', public: false }, from('10.0.0.1'))).json(), { status: 'private' });
  assert.deepEqual((await (await fetch(`${base}/api/ideas`)).json()).ideas, []);
  for (const body of [{ text: '가', public: true }, { text: '가'.repeat(61), public: true }, { text: '좋아요', public: 'yes' }]) {
    assert.equal((await post('/api/ideas', body, from('10.0.0.2'))).status, 400);
  }
  const rejected = await post('/api/ideas', { text: '씨발 이거 고쳐', public: true }, from('10.0.0.2'));
  assert.equal(rejected.status, 422);
  assert.ok(!JSON.stringify(await rejected.json()).includes('씨발'));
  const admin = (headers = {}) => fetch(`${base}/api/ideas/admin`, { headers });
  assert.equal((await admin()).status, 403);
  assert.equal((await admin({ 'X-Admin-Token': 'bc'.repeat(24) })).status, 403);
  const all = (await (await admin({ 'X-Admin-Token': ADMIN })).json()).ideas;
  assert.deepEqual(all.map(i => [i.text, i.status]), [['운영자님만 보세요', 'private'], ['피고도 항소하게 해 주세요', 'pending']]);
  const review = (id, status, token = ADMIN) => fetch(`${base}/api/ideas/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token }, body: JSON.stringify({ status }) });
  assert.equal((await review(all[1].id, 'approved', 'bc'.repeat(24))).status, 403);
  assert.equal((await review(all[0].id, 'approved')).status, 404, 'a private idea can never be published');
  assert.equal((await review(all[1].id, 'approved')).status, 200);
  assert.deepEqual((await (await fetch(`${base}/api/ideas`)).json()).ideas, [{ id: all[1].id, text: '피고도 항소하게 해 주세요', nickname: null }]);
  assert.equal((await review(all[1].id, 'rejected')).status, 200);
  assert.deepEqual((await (await fetch(`${base}/api/ideas`)).json()).ideas, []);
  // 닉네임은 선택이고, 운영자로 오해할 이름이나 기호·이모지는 쓸 수 없다.
  for (const nickname of ['운영자', '운 영 자', '운.영.자', '공식관리자', 'ＡＤＭＩＮ', '생활법원', '🟤갈색', '<b>왕</b>', '씨발']) {
    const res = await post('/api/ideas', { text: '닉네임 시험', public: true, nickname }, from(`10.1.0.${nickname.length}`));
    assert.equal(res.status, 422, nickname);
  }
  assert.equal((await post('/api/ideas', { text: '닉네임 시험', public: true, nickname: '가'.repeat(11) }, from('10.1.1.1'))).status, 400);
  assert.equal((await post('/api/ideas', { text: '닉네임 시험', public: true, nickname: 7 }, from('10.1.1.1'))).status, 400);
  assert.equal((await post('/api/ideas', { text: '별명 단 메모', public: true, nickname: '  야근 요정 ' }, from('10.1.1.2'))).status, 201);
  const named = (await (await admin({ 'X-Admin-Token': ADMIN })).json()).ideas.find(i => i.text === '별명 단 메모');
  assert.equal(named.nickname, '야근 요정');
  assert.equal((await review(named.id, 'approved')).status, 200);
  assert.deepEqual((await (await fetch(`${base}/api/ideas`)).json()).ideas, [{ id: named.id, text: '별명 단 메모', nickname: '야근 요정' }]);
  await review(named.id, 'rejected');
  // 같은 사람은 10분에 5장까지만 붙일 수 있다.
  const burst = [];
  for (let n = 0; n < 6; n++) burst.push((await post('/api/ideas', { text: `아이디어 ${n}번`, public: false }, from('10.0.0.3'))).status);
  assert.deepEqual(burst, [201, 201, 201, 201, 201, 429]);
});
test('jurors vote once per device through the share link, and the owner only reads the tally', async () => {
  const { seq, shareToken, ownerToken, verdict } = await (await post('/api/cases', data)).json();
  const voter = (n) => n.toString(16).padStart(32, '0');
  const jury = (q = '', headers = {}) => fetch(`${base}/api/cases/${seq}/jury${q}`, { headers });
  assert.equal((await jury()).status, 403);
  assert.equal((await jury(`?t=${ownerToken}`)).status, 403);
  assert.deepEqual(await (await jury(`?t=${shareToken}&voter=${voter(1)}`)).json(), { guilty: 0, notGuilty: 0, mine: null });
  for (const body of [{ t: shareToken, voter: 'short', vote: 'guilty' }, { t: shareToken, voter: voter(1), vote: 'maybe' }]) {
    assert.equal((await post(`/api/cases/${seq}/jury`, body)).status, 400);
  }
  assert.equal((await post(`/api/cases/${seq}/jury`, { t: ownerToken, voter: voter(1), vote: 'guilty' })).status, 403);
  // 같은 기기가 동시에 여러 번 눌러도 한 표만 들어간다.
  const same = await Promise.all(Array.from({ length: 5 }, () => post(`/api/cases/${seq}/jury`, { t: shareToken, voter: voter(1), vote: 'guilty' }, { 'X-Forwarded-For': '10.2.0.1' })));
  assert.deepEqual(same.map(r => r.status).sort(), [201, 409, 409, 409, 409]);
  await post(`/api/cases/${seq}/jury`, { t: shareToken, voter: voter(2), vote: 'not_guilty' }, { 'X-Forwarded-For': '10.2.0.2' });
  await post(`/api/cases/${seq}/jury`, { t: shareToken, voter: voter(3), vote: 'guilty' }, { 'X-Forwarded-For': '10.2.0.3' });
  // 다른 표로 바꿀 수 없다.
  const again = await post(`/api/cases/${seq}/jury`, { t: shareToken, voter: voter(2), vote: 'guilty' }, { 'X-Forwarded-For': '10.2.0.2' });
  assert.equal(again.status, 409);
  assert.deepEqual(await again.json(), { guilty: 2, notGuilty: 1, mine: 'not_guilty' });
  assert.deepEqual(await (await jury('', { 'X-Owner-Token': ownerToken })).json(), { guilty: 2, notGuilty: 1, mine: null });
  // 배심원 평결은 판결을 바꾸지 않는다.
  assert.deepEqual((await (await fetch(`${base}/api/cases/${seq}?t=${shareToken}`)).json()).verdict, verdict);
  // 한 접속지에서 너무 많이 투표하면 잠시 막는다.
  const flood = [];
  for (let n = 10; n < 42; n++) flood.push((await post(`/api/cases/${seq}/jury`, { t: shareToken, voter: voter(n), vote: 'guilty' }, { 'X-Forwarded-For': '10.2.9.9' })).status);
  assert.equal(flood.filter(s => s === 429).length, 2);
});

test('usage stats are numbers only and need the operator key', async () => {
  assert.equal((await fetch(`${base}/api/admin/stats`)).status, 403);
  assert.equal((await fetch(`${base}/api/admin/stats`, { headers: { 'X-Admin-Token': 'bc'.repeat(24) } })).status, 403);
  const { seq, ownerToken } = await (await post('/api/cases', data)).json();
  await post(`/api/cases/${seq}/countersuit`, { hits: 3 }, { 'X-Owner-Token': ownerToken });
  const res = await fetch(`${base}/api/admin/stats`, { headers: { 'X-Admin-Token': ADMIN } });
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const stats = await res.json();
  assert.ok(stats.cases.total >= 1 && stats.cases.today >= 1 && stats.cases.week >= stats.cases.today);
  assert.ok(stats.countersuits.played >= 1 && stats.countersuits.perfect >= 1);
  assert.equal(stats.countersuits.skipped, stats.countersuits.total - stats.countersuits.played);
  assert.ok(stats.appeals.total >= stats.appeals.raised && stats.supremes.total >= stats.supremes.raised);
  assert.ok(stats.jury.votes >= stats.jury.cases);
  // 사연 원문이나 토큰은 내보내지 않는다.
  const body = JSON.stringify(stats);
  assert.ok(!body.includes(data.story) && !body.includes(ownerToken));
});
test('moderation rejects every generation path before assigning or storing a case', async () => {
  const beforeSeq = await (await fetch(base + '/api/meta/next-seq')).json();
  const blocked = { ...data, story: '친구가 씨발이라고 하며 저에게 화를 냈어요' };
  const check = await (await post('/api/stories/check', { story: blocked.story })).json();
  assert.equal(check.issue.code, 'abusive_language');
  for (const route of ['/api/cases', '/api/cases/preview', '/api/documents/demand']) {
    const response = await post(route, { ...blocked, seq: 42 });
    assert.equal(response.status, 422);
    const issue = await response.json();
    assert.equal(issue.code, 'CONTENT_REJECTED');
    assert.equal(issue.issue.code, 'abusive_language');
    assert.ok(!JSON.stringify(issue).includes(blocked.story));
  }
  assert.deepEqual(await (await fetch(base + '/api/meta/next-seq')).json(), beforeSeq);
  const allowed = await post('/api/stories/check', { story: '시발점은 개발 일정이 바뀐 일이었어요' });
  assert.deepEqual(await allowed.json(), { issue: null });
  assert.equal((await post('/api/stories/check', { story: '짧음' })).status, 400);
});

test('case confirmation offers candidates, and a filed choice is used only when it is one of them', async () => {
  const story = '친구가 우산 빌려 가서 안 돌려줘요';
  const res = await post('/api/stories/scenario', { story, caseType: 'daily' });
  assert.equal(res.status, 200);
  const { pick, alternatives } = await res.json();
  assert.equal(pick.general, false);
  assert.ok(alternatives.length >= 1 && alternatives.length <= 2);
  assert.ok(alternatives.every((alt) => alt.name !== pick.name && alt.crime.endsWith('혐의') === false));
  const base = { story, caseType: 'daily', relationship: 'friend', severity: 3, tone: 'fair', filingKind: 'complaint' };
  // 고른 후보는 판결 죄명이 되고, 후보가 아닌 사건명은 무시된다.
  const chosen = await (await post('/api/cases', { ...base, scenario: alternatives[0].name })).json();
  assert.equal(chosen.verdict.crime, alternatives[0].crime);
  const forged = await (await post('/api/cases', { ...base, scenario: '휴일 업무 연락 사건' })).json();
  assert.equal(forged.verdict.crime, pick.crime);
  const general = await (await post('/api/cases', { ...base, scenario: 'general' })).json();
  assert.equal(general.verdict.crime, '생활 배려 의무 소홀 혐의');
  // 금칙어는 후보를 보여 주기 전에도 거절한다.
  const rejected = await post('/api/stories/scenario', { story: '친구가 씨발이라고 하며 화를 냈어요', caseType: 'daily' });
  assert.equal(rejected.status, 422);
  assert.equal((await rejected.json()).code, 'CONTENT_REJECTED');
});
