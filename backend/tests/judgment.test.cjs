// Exercise source without generated build artifacts; also resolves the frontend '@/…' alias for sample checks.
require('./register-source.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectScenario, generateVerdict, generateAppeal, generateSupreme, caseYear, formatCaseNo } = require('../src/domain/judgment.ts');
const { generateComplaint, generateDemandLetter } = require('../src/domain/documents.ts');
const input = (story, extra = {}) => ({ story, caseType: 'daily', relationship: 'friend', severity: 3, tone: 'fair', ...extra });

for (const [caseType, story, expected] of require('./scenario-corpus.cjs')) {
  test(`corpus: ${story}`, () => {
    const data = input(story, { caseType });
    const scenario = selectScenario(story, caseType);
    if (expected) assert.equal(scenario.name, expected);
    else assert.equal(scenario.keywords.length, 0);
    const verdict = generateVerdict(data, 42);
    assert.equal(verdict.crime, scenario.crime);
    assert.equal(generateComplaint(data, verdict, 'complaint').crime, scenario.crime);
    assert.ok(generateDemandLetter(data).title.includes(scenario.name));
  });
}

test('specific facts can select a scenario outside the selected category', () => {
  assert.match(selectScenario('상사가 주말에 카톡으로 업무를 지시했어요', 'daily').name, /휴일 업무/);
  assert.match(selectScenario('친구가 안읽씹해서 숫자 1이 안 없어져요', 'messenger').name, /안읽씹/);
});
test('unknown facts never receive a randomly invented specific offense', () => {
  const scenario = selectScenario('친구 때문에 마음이 불편해서 판단을 받고 싶어요', 'daily');
  assert.match(scenario.name, /일상 분쟁/);
  assert.match(scenario.crime, /생활 배려/);
});
test('all generated documents use the same scenario', () => {
  const data = input('상사가 주말에 카톡으로 업무를 지시했어요');
  const verdict = generateVerdict(data, 42);
  assert.equal(generateComplaint(data, verdict, 'complaint').crime, verdict.crime);
  assert.ok(generateDemandLetter(data).title.includes(verdict.caseName));
  assert.match(verdict.advice, /휴일|주말|공휴일/);
  assert.doesNotMatch(verdict.reasoning, /피고인은 ".*"라고 항변/);
});
test('normalization and overlapping keywords do not favor generic scenarios', () => {
  assert.match(selectScenario('친구가 안 읽 씹 해서 숫자 1이 안 없어져요', 'daily').name, /안읽씹/);
  assert.match(selectScenario('내가 보낸 답장은 읽씹하면서 SNS에는 좋아요를 눌러요', 'relationship').name, /SNS/);
  assert.match(selectScenario('새벽에 준비하면서 친구 대신 의견을 냈어요', 'daily').name, /분쟁/);
});
test('insufficient facts cannot lead to a conviction even in strict mode', () => {
  const verdict = generateVerdict(input('친구 때문에 마음이 불편해서 판단을 받고 싶어요', { severity: 5, tone: 'strict' }), 42);
  assert.ok(['무죄', '훈방 조치'].includes(verdict.result));
  assert.match(verdict.reasoning, /단정하지/);
});
test('a single incident is not labeled habitual without a recurrence statement', () => {
  const single = selectScenario('친구가 약속 시간에 늦어서 한 시간을 기다렸어요', 'relationship');
  assert.doesNotMatch(single.name + single.crime, /반복|상습/);
  const repeated = selectScenario('친구가 매번 약속 시간에 늦어서 계속 기다립니다', 'relationship');
  assert.match(repeated.name + repeated.crime, /반복|상습/);
});
test('default settings no longer produce only conditional convictions', () => {
  const results = new Set(Array.from({ length: 80 }, (_, n) => generateVerdict(input(`친구가 약속에 늦어서 ${n}분을 기다렸어요`), 42).result));
  assert.ok(results.size >= 3, [...results].join(', '));
});
test('same input stays deterministic; tone and severity remain monotonic', () => {
  const ranks = ['무죄', '훈방 조치', '조건부 유죄', '유죄', '괘씸죄 가중 유죄'];
  for (let n = 0; n < 40; n++) {
    const data = input(`친구가 약속에 늦어서 ${n}분을 기다렸어요`);
    assert.deepEqual(generateVerdict(data, 42), generateVerdict(data, 42));
    for (const field of ['tone', 'severity']) {
      const values = field === 'tone' ? ['lenient', 'fair', 'strict'] : [1, 2, 3, 4, 5];
      const scores = values.map(value => ranks.indexOf(generateVerdict({ ...data, [field]: value }, 42).result));
      assert.deepEqual(scores, [...scores].sort((a, b) => a - b));
    }
  }
});

test('the same story and choices give the same first verdict under any case number, as the glossary promises', () => {
  const strip = ({ caseNo, ...rest }) => rest;
  for (const [caseType, story] of require('./scenario-corpus.cjs')) {
    const data = input(story, { caseType });
    const first = strip(generateVerdict(data, 42));
    for (const seq of [43, 500, 9999]) assert.deepEqual(strip(generateVerdict(data, seq)), first, story);
  }
  // 용어 풀이에 적은 대로, 항소 결과는 사건번호에 따라 달라질 수 있다(약속을 넘지 않는지 확인).
  const data = input('친구가 약속에 40분 늦고는 사과도 없이 메뉴부터 골랐어요', { caseType: 'relationship' });
  const orders = new Set(Array.from({ length: 60 }, (_, n) => generateAppeal(data, generateVerdict(data, 100 + n)).order));
  assert.ok(orders.size > 1);
});

test('a verdict never treats the absent defendant\'s side as proven fact', () => {
  for (const [caseType, story] of require('./scenario-corpus.cjs')) {
    for (const severity of [1, 3, 5]) {
      const verdict = generateVerdict(input(story, { caseType, severity }), 42);
      // 상대의 진술·증빙은 제출되지 않았음을 밝히고, 원고 사연만 증거로 둔다.
      assert.ok(verdict.evidence.some((e) => /상대방의 진술과 객관적 증빙은 별도로 제출되지 아니하였다/.test(e)), story);
      assert.equal(verdict.evidence.length, 2);
      if (selectScenario(story, caseType).keywords.length > 0) assert.match(verdict.reasoning, /사연 밖의 구체적인 행동이나 동기를 인정하지 아니한다/, story);
    }
  }
});

test('every landing sample matches what the generator really produces for that story', () => {
  const { LANDING_SAMPLES, landingSample } = require('../../frontend/src/domain/samples.ts');
  assert.ok(LANDING_SAMPLES.length >= 14);
  for (const s of LANDING_SAMPLES) {
    const verdict = generateVerdict(input(s.story, { caseType: s.caseType }), 42);
    assert.equal(verdict.crime, s.crime, s.story);
    assert.ok(verdict.order.startsWith(s.order), s.story);
    // 카드 크기를 고정하므로 두 줄·한 줄 안에 들어갈 길이만 쓴다.
    assert.ok(s.story.length <= 34 && s.order.length <= 40 && s.crime.length <= 13, s.story);
  }
  // 하루 동안은 같은 예시, 날이 바뀌면 다른 예시가 나올 수 있다.
  assert.deepEqual(landingSample('2026-11-04'), landingSample('2026-11-04'));
  const week = new Set(['01', '02', '03', '04', '05', '06', '07'].map((d) => landingSample(`2026-12-${d}`).story));
  assert.ok(week.size >= 4);
});

test('story-page examples are fictional, varied by day, and each leads to a specific offense', () => {
  const ex = require('../../frontend/src/domain/examples.ts');
  assert.equal(ex.EXAMPLE_STORIES.length, 28);
  for (const t of ['work', 'relationship', 'meal', 'messenger', 'money', 'romance', 'daily']) {
    assert.equal(ex.EXAMPLE_STORIES.filter((e) => e.type === t).length, 4, t);
  }
  for (const { type, text } of ex.EXAMPLE_STORIES) {
    assert.ok(selectScenario(text, type).keywords.length > 0, `example falls to a general dispute: ${text}`);
    assert.ok(text.length <= 34, text);
  }
  const today = ex.pickExamples('2026-11-04');
  assert.equal(today.length, ex.EXAMPLE_COUNT);
  assert.deepEqual(ex.pickExamples('2026-11-04'), today);
  const types = today.map((t) => ex.EXAMPLE_STORIES.find((e) => e.text === t).type);
  assert.equal(new Set(types).size, today.length, 'one example per case type');
  assert.notDeepEqual(ex.pickExamples('2026-11-04', 1), today);
  assert.equal(ex.exampleDay(new Date('2026-11-03T15:00:00Z')), '2026-11-04');
});

test('case numbers carry the Korean year of filing instead of a fixed 2026', () => {
  // 한국 시간 1월 1일 0시(= UTC 12월 31일 15시)에 연도가 바뀐다.
  assert.equal(caseYear(new Date('2026-12-31T14:59:59Z')), 2026);
  assert.equal(caseYear(new Date('2026-12-31T15:00:00Z')), 2027);
  assert.equal(formatCaseNo(42, 2027), '2027 생활 제042호');
  assert.match(generateVerdict(input('친구가 약속에 40분 늦고는 사과도 없이 메뉴부터 골랐어요'), 42).caseNo, new RegExp(`^${caseYear()} 생활 제042호$`));
  const frontend = require('../../frontend/src/domain/judgment.ts');
  assert.equal(frontend.caseYear(new Date('2026-12-31T15:00:00Z')), 2027);
});

test('penalties are as varied as the scenarios and fit the case type', () => {
  const notes = new Map();
  let drinks = 0, total = 0;
  for (const [caseType, story] of require('./scenario-corpus.cjs')) {
    for (const severity of [1, 2, 3, 4, 5]) {
      for (const tone of ['lenient', 'fair', 'strict']) {
        const verdict = generateVerdict(input(story, { caseType, severity, tone }), 100);
        total++;
        if (/음료|커피/.test(verdict.order + verdict.resultNote)) drinks++;
        notes.set(verdict.resultNote, verdict.result);
      }
    }
  }
  // 예전에는 처분 문구가 10개뿐이었고 조건부 유죄의 절반이 '음료 1잔'이었다.
  assert.ok(notes.size >= 80, `only ${notes.size} distinct penalty notes`);
  assert.ok(drinks / total < 0.02, `drinks appear in ${drinks}/${total} verdicts`);
  for (const [note, result] of notes) {
    if (result === '조건부 유죄') assert.match(note, /^단, .*유예/, note);
    assert.doesNotMatch(note, /음료/, note);
  }
  // 메신저 사건의 조건부 유죄는 메신저다운 조건을 받을 수 있다.
  const messenger = new Set();
  for (let seq = 0; seq < 200; seq++) {
    const verdict = generateVerdict(input(`친구가 안읽씹해서 숫자 1이 안 없어져요 ${seq}번째`, { caseType: 'messenger', severity: 3, tone: 'fair' }), seq);
    if (verdict.result === '조건부 유죄') messenger.add(verdict.resultNote);
  }
  assert.ok([...messenger].some((note) => /메시지|답장|단체방/.test(note)), [...messenger].join('\n'));
});

test('a plaintiff appeal never lightens the verdict and raises it at most one step', () => {
  const ladder = ['무죄', '훈방 조치', '조건부 유죄', '유죄', '괘씸죄 가중 유죄'];
  let sustained = 0;
  for (const [caseType, story] of require('./scenario-corpus.cjs')) {
    for (const severity of [1, 2, 3, 4, 5]) {
      for (const tone of ['lenient', 'fair', 'strict']) {
        const data = input(story, { caseType, severity, tone });
        const verdict = generateVerdict(data, 42);
        const appeal = generateAppeal(data, verdict);
        assert.deepEqual(generateAppeal(data, verdict), appeal);
        assert.doesNotMatch(appeal.order, /무죄/);
        const before = ladder.indexOf(verdict.result);
        if (!appeal.overturned) {
          assert.equal(appeal.order, '항소 기각. 원심 유지.');
          continue;
        }
        sustained++;
        const after = ladder.indexOf(appeal.order.match(/^원심 파기\. (.+)\.$/)[1]);
        assert.equal(after, before + 1);
        if (selectScenario(story, caseType).keywords.length === 0) assert.ok(after <= ladder.indexOf('훈방 조치'));
        if (before === ladder.length - 1) assert.fail('the heaviest verdict cannot be raised');
      }
    }
  }
  assert.ok(sustained > 0);
});

test('a supreme appeal starts from the appeal result, never lightens it, and always ends final', () => {
  const ladder = ['무죄', '훈방 조치', '조건부 유죄', '유죄', '괘씸죄 가중 유죄'];
  let raised = 0;
  for (const [caseType, story] of require('./scenario-corpus.cjs')) {
    for (const severity of [1, 3, 5]) {
      for (const tone of ['lenient', 'fair', 'strict']) {
        const data = input(story, { caseType, severity, tone });
        const verdict = generateVerdict(data, 42);
        const appeal = generateAppeal(data, verdict);
        const before = appeal.overturned ? appeal.order.match(/^원심 파기\. (.+)\.$/)[1] : verdict.result;
        if (appeal.overturned) assert.ok(appeal.orderNote.length > appeal.orderNote.indexOf(')') + 2, 'a raised appeal names its penalty');
        const supreme = generateSupreme(data, verdict, appeal);
        assert.deepEqual(generateSupreme(data, verdict, appeal), supreme);
        assert.match(supreme.order, /판결 확정\.$/);
        assert.doesNotMatch(supreme.order, /무죄/);
        const after = ladder.indexOf(supreme.finalResult);
        if (!supreme.overturned) {
          assert.equal(supreme.finalResult, before);
          continue;
        }
        raised++;
        assert.equal(after, ladder.indexOf(before) + 1);
        if (selectScenario(story, caseType).keywords.length === 0) assert.ok(after <= ladder.indexOf('훈방 조치'));
      }
    }
  }
  assert.ok(raised > 0);
});

test('the screen blocks an appeal exactly when the rules could only dismiss it, and open appeals win often enough', () => {
  const front = require('../../frontend/src/domain/judgment.ts');
  const { GENERAL_CRIME } = require('../src/domain/judgment.ts');
  assert.equal(front.GENERAL_CRIME, GENERAL_CRIME);
  let open = 0, raised = 0;
  for (const [caseType, story] of require('./scenario-corpus.cjs')) {
    for (const severity of [1, 2, 3, 4, 5]) {
      for (const tone of ['lenient', 'fair', 'strict']) {
        for (const seq of [42, 77, 130]) {
          const data = input(story, { caseType, severity, tone });
          const verdict = generateVerdict(data, seq);
          const appeal = generateAppeal(data, verdict);
          const block = front.raiseBlock(verdict.result, verdict.crime);
          if (block) {
            assert.equal(appeal.overturned, false, `${block}: ${story}`);
          } else {
            open++;
            if (appeal.overturned) raised++;
          }
          const supremeBlock = front.raiseBlock(front.appealResult(verdict, appeal), verdict.crime);
          if (supremeBlock) assert.equal(generateSupreme(data, verdict, appeal).overturned, false, story);
        }
      }
    }
  }
  // 막히지 않은 항소는 절반 넘게 받아들여진다(2026-11-04 확률 10%p 상향).
  assert.ok(raised / open > 0.5, `open appeals raised ${raised}/${open}`);
});

test('a supreme appeal reads an old-rule appeal that acquitted from its order', () => {
  const data = input('친구가 약속에 40분 늦고는 사과도 없이 메뉴부터 골랐어요', { caseType: 'relationship', severity: 4 });
  const verdict = { ...generateVerdict(data, 42), result: '유죄' };
  const legacy = { order: '원심 파기. 무죄.', orderNote: '', reasoning: '', overturned: true };
  for (let seq = 42; seq < 80; seq++) {
    const supreme = generateSupreme(data, { ...verdict, caseNo: `2026 생활 제${seq}호` }, legacy);
    assert.ok(['무죄', '훈방 조치'].includes(supreme.finalResult), supreme.finalResult);
  }
});

test('an appeal judges a stored general-dispute verdict by its stored crime, not today\'s rules', () => {
  const data = input('회식비 N빵 하는데 술 안 마신 나까지 똑같이 내래요', { caseType: 'money' });
  for (let seq = 100; seq < 140; seq++) {
    const stored = { ...generateVerdict(data, seq), crime: '생활 배려 의무 소홀 혐의', result: '훈방 조치' };
    const appeal = generateAppeal(data, stored);
    assert.equal(appeal.overturned, false);
    assert.match(appeal.orderNote, /근거가 부족하다/);
  }
});
