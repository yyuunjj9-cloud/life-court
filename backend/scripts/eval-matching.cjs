// 사건 분류 시험지 채점 — docs/plan-accuracy.md의 지표(오답률·적중률·보류율)를 계산한다.
// 사용: node backend/scripts/eval-matching.cjs [dev|test|all|holdout|holdout2] [--wrong]
// holdout은 봉인 시험지다. 결과 숫자만 보고, --wrong으로 문항을 열어 규칙을 맞추지 않는다.
const path = require('node:path');
require(path.join(__dirname, '../tests/register-source.cjs'));

const { selectScenario, GENERAL_CRIME } = require('../src/domain/judgment.ts');
const EVAL_SET = require('../tests/eval/eval-set.cjs');
const HOLDOUT = require('../tests/eval/holdout-set.cjs').map((item) => ({ ...item, split: 'holdout' }));
const HOLDOUT2 = require('../tests/eval/holdout2-set.cjs').map((item) => ({ ...item, split: 'holdout2' }));

// 반복 표현이 없는 사연은 사건명에서 '반복·상습'이 빠지므로 비교할 때 같은 이름으로 본다.
const base = (name) => name.replace(/\s(?:반복|상습)(?=\s)/g, '');

/** 한 문항의 결과: hit(정답) / miss(보류) / wrong(다른 구체 죄명) / ok-general(정답이 일반 분쟁이고 보류) */
function grade(item, pick = selectScenario) {
  const scenario = pick(item.story, item.caseType);
  const general = scenario.crime === GENERAL_CRIME;
  const accepted = item.expected === null ? [] : [].concat(item.expected).map(base);
  let result;
  if (!accepted.length) result = general ? 'ok-general' : 'wrong';
  else if (general) result = 'miss';
  else result = accepted.includes(base(scenario.name)) ? 'hit' : 'wrong';
  return { ...item, got: general ? null : scenario.name, result };
}

function score(split = 'all', pick = selectScenario) {
  const items = (split === 'holdout' ? HOLDOUT : split === 'holdout2' ? HOLDOUT2 : EVAL_SET.filter((item) => split === 'all' || item.split === split)).map((item) => grade(item, pick));
  const specific = items.filter((item) => item.expected !== null);
  const count = (list, result) => list.filter((item) => item.result === result).length;
  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
  return {
    split,
    total: items.length,
    wrongRate: pct(count(items, 'wrong'), items.length),
    hitRate: pct(count(specific, 'hit'), specific.length),
    missRate: pct(count(specific, 'miss'), specific.length),
    generalKept: pct(count(items, 'ok-general'), items.length - specific.length),
    wrong: items.filter((item) => item.result === 'wrong'),
    missed: items.filter((item) => item.result === 'miss'),
  };
}

module.exports = { grade, score };

if (require.main === module) {
  const split = process.argv[2] || 'all';
  const s = score(split);
  console.log(`[${s.split}] 문항 ${s.total} · 오답률 ${s.wrongRate}% · 적중률 ${s.hitRate}% · 보류율 ${s.missRate}% · 일반 분쟁 유지 ${s.generalKept}%`);
  if (process.argv.includes('--wrong') && !split.startsWith('holdout')) {
    for (const w of s.wrong) console.log(`WRONG [${w.caseType}] ${w.story}\n   정답 ${w.expected ?? '일반'} → 결과 ${w.got}`);
    for (const m of s.missed) console.log(`MISS  [${m.caseType}] ${m.story}\n   정답 ${m.expected}`);
  }
}
