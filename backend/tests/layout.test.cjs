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

test('the board ticker keeps a readable speed and can be stopped', () => {
  const page = source('app/page.tsx');
  assert.match(page, /const BOARD_SPEED = 60;/);
  assert.match(page, /group\.offsetWidth \/ BOARD_SPEED/);
  assert.match(css, /\.board-track\.held \{\s*animation-play-state: paused;/);
  const reduced = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?^\}/m)?.[0];
  assert.match(reduced, /\.board-track \{[\s\S]*?animation: none;/);
});

test('choosing a card or example never moves the rest of the intake screen', () => {
  // 선택 시 생기거나 사라지는 영역이 없어야 아래가 밀리지 않는다.
  const type = source('app/intake/type/page.tsx');
  assert.doesNotMatch(type, /\{crimeHint && \(/);
  assert.match(type, /\.slice\(0, 2\)/);
  assert.match(css, /\.crime-hint \{[\s\S]*?min-height: 3\.2em;/);
  const story = source('app/intake/story/page.tsx');
  assert.doesNotMatch(story, /draft\.story\.trim\(\)\.length === 0 && \(/);
  // 선택 표시는 크기·위치·굵기를 바꾸지 않고, 경고색인 빨강을 쓰지 않는다.
  for (const selector of ['.ev[aria-pressed="true"]', '.pill[aria-pressed="true"]', '.example-chip[aria-pressed="true"]']) {
    const rule = css.match(new RegExp(`^${selector.replace(/[.[\]"=]/g, (c) => '\\' + c)} \\{[\\s\\S]*?^\\}`, 'm'))?.[0];
    assert.ok(rule, `${selector} rule not found`);
    assert.doesNotMatch(rule, /transform|font-weight|objection-red/, selector);
  }
  const badge = css.match(/^\.ev\[aria-pressed="true"\]::after \{[\s\S]*?^\}/m)?.[0];
  assert.doesNotMatch(badge, /top: -|right: -/);
  // 휴대폰에서 탭 뒤에 남는 hover로 카드가 들려 있지 않게 한다.
  assert.match(css, /@media \(hover: hover\) \{\s*\.filing-opt:hover/);
});

test('the memo board discloses how ideas are kept, and its admin screen stays out of search', () => {
  const notice = source('app/notice/page.tsx');
  assert.match(notice, /<MemoBoard \/>/);
  // 운영자가 낸 예정 메모와 이용자 메모를 구분해 표시한다.
  const board = source('components/MemoBoard.tsx');
  assert.match(board, /운영자 아이디어/);
  assert.match(board, /이용자 아이디어/);
  // 이용자 메모의 꼬리표는 운영자용 갈색(owner)을 쓰지 않는다. 닉네임은 글자로만 들어간다.
  const userMemo = board.match(/className="memo user"[\s\S]*?<\/div>/)?.[0];
  assert.ok(userMemo, 'user memo markup not found');
  assert.doesNotMatch(userMemo, /owner|style=|dangerouslySetInnerHTML/);
  assert.match(notice, /운영자가 확인한 뒤에만[^"]*게시/);
  assert.match(notice, /닉네임에는 실명 등 개인정보를 적지 마세요/);
  const admin = source('app/ideas/admin/layout.tsx');
  assert.match(admin, /robots: \{ index: false, follow: false \}/);
  assert.match(admin, /referrer: "no-referrer"/);
  // 열쇠는 주소창에서 바로 지운다.
  assert.match(source('app/ideas/admin/page.tsx'), /history\.replaceState/);
});

test('the board keeps its place while loading so the landing does not jump', () => {
  const page = source('app/page.tsx');
  // 응답 뒤에 끼워 넣으면 판결 예시와 버튼이 밀린다 — 자리는 항상 렌더링한다.
  assert.doesNotMatch(page, /\{board && board\.recent\.length > 0 && \(/);
  assert.match(page, /useState<BoardData \| null>\(boardCache\)/);
  assert.match(css, /\.board-track\.idle \{\s*animation: none;/);
  assert.match(css, /\.board-stat \{[\s\S]*?white-space: nowrap;/);
  // 휴대폰 대부분(세로 600px 이상)에서 전광판이 보여야 한다. 예전 760px 기준은 휴대폰에서 늘 숨겼다.
  assert.doesNotMatch(css, /max-height: 760px/);
  assert.match(css, /@media \(max-height: 599px\) \{\s*\.scr\.dark \.board \{\s*display: none;/);
  assert.match(css, /\.board-live \{[\s\S]*?white-space: nowrap;/);
  // 도장 연출이 옆으로 넘쳐도 가로 스크롤바가 생겨 화면 높이가 바뀌지 않는다.
  const scr = css.match(/^\.scr \{[\s\S]*?^\}/m)?.[0];
  assert.match(scr, /overflow-x: hidden;/);
  assert.match(scr, /overflow-y: auto;/);
});
