# Claude Code 인수인계 — 오늘의 생활법원

작성일: 2026-11-02. 이 문서는 대화 없이도 개발을 이어가기 위한 최종 상태 요약이다.

## 현재 상태

- 사용자가 요청한 기능 구현, 운영 배포, 실제 Postgres 동시성 검증, CI 연결까지 완료했다. 진행 중인 필수 코드 작업은 없다.
- 마지막 반영 커밋은 `git log`로 확인한다. 2026-11-03에 사연 매칭 보완, 첫 화면 판결 예시, 스크롤 끝 하단 여백 수정, 맞고소 가상 연출 표시를 반영했다.
- 2026-11-03 운영 확인: health가 `{"ok":true,"storage":"postgres","db_ok":true}`였다. 이후 상태는 필요할 때 다시 조회한다.
- CI 결과는 `gh run list`로 확인한다.
- 2026-11-03 기준 회귀 테스트는 164개 통과다. 과거 기록의 51개·72개·75개·135개·156개·158개는 이전 중간 결과다.
- 3심제: 항소심 화면에서 원고가 원할 때만 '대법원에 상고하기'(`/supreme`)를 연다. 항소심 결과에서 한 단계 가중 또는 기각이며, 어느 쪽이든 확정이다. `cases.supreme` 열은 부팅 마이그레이션이 추가한다.
- 벌칙: 조건부 유죄·유죄·괘씸죄 문구는 판결이 인정한 사건 유형별 벌칙(`PENALTIES_BY_TYPE`)과 공통 문구에서 고른다. 맞고소 인용 벌칙은 `COUNTER_PENALTIES`. 음료 반복을 막는 다양성 기준을 `judgment.test.cjs`가 고정한다.
- 선택 UI 원칙: 카드·버튼·예시를 고를 때 다른 요소의 위치가 바뀌면 안 된다. 선택 표시는 나무색 테두리·배경으로만 하고 크기·위치·굵기를 바꾸지 않으며, 빨강은 경고·연출용으로 남긴다. 고르면 생기는 안내는 자리를 미리 잡는다. `backend/tests/layout.test.cjs`가 고정한다.
- 맞고소 미니게임과 피고 참여 확장 계획은 `docs/plan-countersuit-game.md`에 있다. 0·1단계(혼자 변론 게임)를 적용했고 2단계 이후는 문서의 착수 조건을 확인한 뒤 진행한다.
- 메인 화면 전광판은 응답 전에도 같은 높이로 자리를 잡고, 홈 재방문 시 마지막 값을 바로 보여준다. `.scr`는 가로 스크롤을 막는다(도장 연출이 넘쳐 가로 스크롤바가 생기면 화면이 움찔했다).
- 인수인계 시작 전부터 `.claude/settings.local.json`에 사용자 로컬 변경이 있었다. Codex가 수정·커밋하지 않았으므로 임의로 복원하거나 다른 변경과 함께 커밋하지 않는다.
- 이 인수인계용 `CLAUDE.md`, 본 문서, QA 기록 정정은 마지막 기능 수정 이후 별도 문서 전용 커밋으로 반영한다. 앱 동작 변경은 없으며, main push에 연결된 기존 CI·자동 배포는 실행될 수 있다.

## 공개 주소와 사용자 의도

| 용도 | 주소 |
|---|---|
| 동료에게 보내는 초대·홍보용 | https://life-court.vercel.app/invite |
| 본 서비스 | https://life-court.vercel.app/ |
| 백엔드 health | https://life-court-api.onrender.com/api/health |

`/invite`는 개발 검토용 배포나 특정인의 판결문이 아니다. 카카오톡 등의 미리보기에 ‘그 사소한 억울함, 판결받고 가세요.’라는 초대 카드가 나오고, 클릭하면 별도 중간 화면·로그인 없이 기존 앱을 바로 표시한다. OG 이미지는 `/api/og?invite=1`이다.

## 제품·구조

- 일상의 사소한 억울함을 가상 법정에서 심리하고 고소장·내용증명·판결문을 만들어 공유하는 오락용 앱이다. 실제 법률 자문이 아니다.
- 문서 생성은 LLM 없이 키워드·템플릿·시드 난수 기반이다. 같은 입력은 같은 결과를 재현한다.
- `frontend/`: Next.js 16 / React 19 / TypeScript / Tailwind 4 / html-to-image.
- `backend/`: Express 5 / TypeScript / pg. `DATABASE_URL`이 없으면 메모리 저장소다.
- `db/schema.sql`: 사건·문서 JSONB와 `case_counters` 스키마.
- Vercel → Render → Supabase의 기존 3티어를 유지한다. 운영 DB는 다른 앱과 공유하는 Supabase 프로젝트의 `lifecourt` 스키마다. 다른 스키마·역할을 건드리지 않는다.
- 사용자 초안은 localStorage, 진행 중 사건·접수자 토큰은 sessionStorage에 유지한다. 내용증명은 접수 전 생성 단계이며, 실제 발송이나 3일 기한 감시 기능은 없다.

## 완료한 핵심 수정

### 사연·죄목·판결 품질

주요 코드: `backend/src/domain/judgment.ts`, `backend/src/domain/documents.ts`.

- 단순 키워드 개수와 무작위 대체 선택 대신 구체적 행위·문맥을 우선한다. 선택한 유형 밖에서도 더 명확한 사건을 찾는다.
- 근거가 부족하거나 모호하면 일반 분쟁으로 처리하고 무관한 구체적 죄목을 붙이지 않는다. 이 경우 유죄 처분을 제한한다.
- 일부 부정·오해 표현을 보수적으로 처리하고, 반복 사실이 없는 사연에 ‘상습·반복’ 명칭을 붙이지 않는다.
- 심각성 3·공정함이면 항상 조건부 유죄가 나오던 문제를 고쳤다. 심각성·성향, 반복·고의·사과·피해 회복 표현과 사연 시드의 제한적 보정을 사용한다. 같은 사연에서 심각성·성향이 엄격해질수록 수위가 낮아지지 않는 테스트를 유지한다.
- 판결문·고소장·내용증명은 같은 사건 선택 로직을 사용한다. 생활 개선 권고도 해당 사건 조치와 연결한다.
- 원심 판결 이유와 증거에 제출되지 않은 상대방 진술을 사실처럼 만들지 않는다. 저장된 과거 판결을 새 규칙으로 일괄 덮어쓰지 않는다.
- 규칙 기반이므로 복합 사연·부정 표현·풍자의 의미를 완전히 이해하는 것은 아니다. 품질 보완 시 `backend/tests/scenario-corpus.cjs`에 사례를 먼저 추가한다. 현재 사연 36개는 합성 예문이다.

### 공유·피고 답변서·권한

주요 코드: `backend/src/index.ts`, `frontend/src/lib/share.ts`, `frontend/src/store/case-store.tsx`, `frontend/src/app/s/[id]/`, `DefenseSection.tsx`.

- 공유 화면의 타입·props 불일치를 수정하고 피고 답변서를 연결했다. 준비된 선택지와 응소 거부를 지원하며 원심 판결 자체는 바꾸지 않는다.
- 사건 접수 시 공유용·접수자용 토큰을 독립적인 192비트 난수로 발급한다.
- `/s/사건번호-공유토큰`은 판결 조회와 답변서 제출용이다. 항소·맞고소는 별도 `X-Owner-Token`이 필요하다.
- 공유 조회 응답에는 접수자 토큰·입력 원문을 반환하지 않는다. 응답은 no-store, 공유 페이지는 noindex/no-referrer다.
- 예전 FNV 해시 기반 짧은 `/s/` 링크는 보안 강화로 무효다. 토큰 없는 과거 사건의 추가 항소·맞고소도 제한된다. 브라우저에 남은 기존 문서는 이미지로 저장·공유할 수 있다.
- 구형 `/shared?d=...`는 입력을 URL에 담아 현재 규칙으로 판결을 재생성하는 별도 방식이다. DB 저장 원본과 영구적으로 같은 결과를 보장하지 않으므로 새 공유에는 사용하지 않는다.
- 상태 복원 전에 홈으로 이동하던 새로고침 문제를 수정했다. 문서 화면의 진입 가드는 store의 `hydrated` 이후에 판단한다.
- 프록시는 `NEXT_PUBLIC_API_URL`을 따른다. 로컬 테스트가 운영 API로 향하도록 고정하지 않는다. API 요청에는 재시도와 요청별 타임아웃이 있다.

### 법정 연출·OG

주요 코드: `Burst.tsx`, `appeal/page.tsx`, `countersuit/page.tsx`, `api/og/route.tsx`.

| 표현 | 표시 조건 | 색 |
|---|---|---|
| Objection! | 메인 화면 | 붉은색 |
| Overruled! | 원고 항소 기각·원심 유지 | 남색 |
| Sustained! | 원고 항소 인용·처분 한 단계 가중 | 녹색 |
| Case dismissed! | 맞고소 기각·각하 | 짙은 갈색 |
| Inadmissible! | 금칙어·개인정보 등으로 진술 보완 요청 | 차분한 황갈색 |

맞고소 인용에는 Dismissed를 표시하지 않는다. 영문은 게임풍 화면 효과이고, 저장용 `.vdoc` 판결문은 정확한 한국어 결과를 유지한다. OG 카드에는 작은 영문 장식과 한국어 사건·초대 문구를 함께 사용한다.

새 한글 문구가 빠지는 축약 폰트 문제를 해결하기 위해 OG에 전체 나눔명조 글꼴을 사용한다. `frontend/src/app/api/og/OFL.txt`를 함께 유지한다. 축약본으로 되돌리면 새 문구의 글리프 누락을 다시 검증해야 한다.

### 접수 필터

규칙의 단일 원본: `backend/src/domain/moderation.ts`. 상세 기준: `docs/intake-policy.md`.

- 명확한 욕설·비하, 전화번호·이메일·주민등록번호 형식, 직접적인 위협 표현을 검사한다. 일부 공백·구두점·보이지 않는 문자·전각 변형도 처리한다.
- ‘읽씹’, ‘시발점’, ‘혹시 발송…’ 등 정상 표현의 오탐 테스트를 유지한다. 모든 혐오 표현·개인정보·우회를 완벽히 식별하는 필터는 아니다.
- `POST /api/stories/check`는 저장하지 않고 `{issue: null 또는 수정 안내}`를 반환한다.
- 사건 접수·구형 공유 재현·내용증명 API도 서버에서 검사해 우회를 막는다. 차단은 HTTP 422 / `CONTENT_REJECTED`이며 원문을 오류 응답에 반사하지 않고 사건번호도 발급하지 않는다.
- 거절된 원문을 서버 DB에 저장하지 않는다. 사용자가 수정할 수 있도록 브라우저 입력은 유지한다. 기존 저장 사건은 소급 삭제하지 않는다.
- UI는 작은 `Inadmissible!` 도장 + ‘진술 보완 요청’ + 구체적 수정 이유 + ‘진술 수정하기’다. 사람을 비난하거나 큰 경고 효과로 무안하게 하지 않는 것이 사용자의 선호다.
- `ApiError`와 store의 `intakeIssue`를 통해 정책 거절과 서버 연결 오류를 구분한다. 필터는 클라이언트에 별도 복제하지 않는다.

### Postgres·CI

주요 코드: `backend/src/storage.ts`, `backend/tests/postgres/storage.test.cjs`, `.github/workflows/ci.yml`. 상세: `docs/ci.md`.

- 번호는 `case_counters`의 단일 UPSERT로 예약한다. 미리보기는 번호를 소모하지 않는다. 실패한 접수로 생기는 번호 공백은 허용한다.
- 답변서는 `UPDATE ... WHERE response IS NULL`로 한 요청만 성공한다.
- 실제 DB 테스트에서 동시 초기화의 `CREATE TABLE IF NOT EXISTS`도 시스템 카탈로그 중복 키로 실패할 수 있음을 재현했다. 같은 연결의 트랜잭션 + 스키마별 `pg_advisory_xact_lock`으로 초기화 전체를 직렬화해 해결했다. 이 잠금을 제거하지 않는다.
- GitHub Actions에서 Node 24, 일회용 Postgres 16, 공식 액션의 SHA 고정, contents:read 권한으로 검사한다. 기존 keepalive 워크플로는 유지했다.
- 실제 DB 테스트는 3개 연결 풀의 120건 동시 발급·저장, 답변 100건 중 1건 성공, 예약 번호의 재시작 내구성, 기존 문서 보존 및 동시 마이그레이션을 확인했다.
- Postgres 테스트는 `TEST_DATABASE_URL`만 읽는다. loopback + `lifecourt_test` DB만 허용하고 매 테스트의 임시 스키마만 정리한다. `DATABASE_URL`로 대체하거나 운영 Supabase에서 실행하지 않는다. 테스트 URL 누락 시 skip이 아니라 실패한다.
- CI는 push·PR·수동 실행 시 회귀 테스트 → 실제 Postgres → 타입 검사 → 빌드를 수행한다. **CI 실패가 main 병합·자동 배포를 차단하도록 브랜치 보호를 설정한 것은 아니다.**

## 실행·검증

양쪽 의존성을 설치해야 한다. 일부 backend 테스트는 frontend의 공유 유틸·React 컴포넌트도 검증한다.

```powershell
npm.cmd ci --prefix backend
npm.cmd ci --prefix frontend
npm.cmd test
npm.cmd run typecheck
npm.cmd run build

# 별도 로컬 테스트 DB가 있을 때만 실행
$env:TEST_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/lifecourt_test'
npm.cmd run test:postgres

# 두 터미널에서 개발 서버 실행
npm.cmd run dev:backend
npm.cmd run dev:frontend
```

이 PC에는 마지막 확인 기준 Docker·psql이 없었다. 실제 DB 검증은 GitHub Actions 컨테이너에서 완료했다. Windows PowerShell에서는 `npm.ps1` 실행 정책 문제를 피하려고 `npm.cmd`를 사용했다. 대괄호가 있는 파일 경로를 읽을 때는 `Get-Content -LiteralPath 'frontend/src/app/s/[id]/page.tsx' -Encoding utf8`처럼 사용한다.

백엔드는 `.env`를 자동 로딩하는 코드가 없으므로 DB가 필요하면 해당 프로세스의 환경변수를 설정한다. 로컬 API를 바꿨으면 프론트의 `NEXT_PUBLIC_API_URL`도 맞춘다. 프론트 코드 변경 전에는 `frontend/AGENTS.md`에 따라 설치된 Next.js 문서를 확인한다.

## 배포·커밋

Git remote: `https://github.com/yyuunjj9-cloud/life-court.git`. Vercel과 Render 모두 main 자동 배포가 켜져 있었다. API 계약이 바뀌면 백엔드를 먼저 반영하고 live/health 확인 후 프론트를 반영한다. 상세 식별자는 `docs/deploy.md`에 있으며, 비밀값을 새 문서나 대화에 복사하지 않는다.

| 커밋 | 내용 |
|---|---|
| 742b9942 | 사연·판결 개선, 답변서·권한·동시성 기초 |
| 042ce089 | 공유 화면 완성, 법정 영문 효과·OG, 새로고침 복구 |
| a4cf718b | 서버 접수 필터 |
| 1f5e6d3a | Inadmissible 안내, 초대 페이지 |
| d356d5ad | 실제 Postgres 검증 및 CI |
| 7e7b74dc | 실제 DB 테스트로 발견한 동시 초기화 충돌 수정 |
| 6cb32a3d | 스크롤 끝 하단 여백 수정 (`.pad` 수축 방지) |
| 73dbcfcc | 첫 화면 판결 예시, 사연 매칭 보완 |
| 51ff6edc | 항소를 원고의 항소로 수정, 판결 논리 보완 |
| 2681477c | 맞고소 혼자 변론 게임 API (백엔드) |

## 남은 확인과 이후 작업

1. 실제 아이폰 Safari·카카오톡에서 저장·공유 시트, 키보드·하단 버튼·safe-area, 초대 카드 표시를 확인한다. 375/390px Chromium 테스트와 HTTP OG 검증만 했으며 실기기 확인으로 주장하지 않는다.
2. 동료들의 실제 사연에서 죄목 오분류·금칙어 오탐을 수집해 회귀 테스트에 추가한다. 필터를 무작정 확대하거나 단순 단어 조각으로 죄목을 붙이지 않는다. 합성 문장 기준 일반 혐의 비율은 약 26%이고 상대 잘못이 없는 문장에 죄목이 붙는 오판도 남아 있다. 운영 DB의 사연은 고지문 제2조 때문에 공개 저장소의 코퍼스로 옮기지 않고, 본인이 직접 보낸 사연만 고쳐 써서 넣는다.
3. CI 실패 시 병합·배포 차단을 원하면 별도 요구사항으로 설정한다. 현재 자동 검사와 자동 배포를 동일한 보장으로 설명하지 않는다.
4. 요청받지 않은 기능 확장은 하지 않아도 된다. 사건번호의 기본 연도 2026 고정 등 장기 유지보수 항목은 향후 필요 시 다룬다. 현재 서비스에 LLM·새 외부 서비스가 연결된 상태로 오해하지 않는다.

## 다음 Claude 대화 시작 문구

> CLAUDE.md와 docs/HANDOFF-CLAUDE.md를 먼저 읽고 git status를 확인해 주세요. 현재 구현·배포와 CI 검증은 완료된 상태입니다. 기존 .claude/settings.local.json 변경은 보존하고, 완료된 작업을 다시 하지 말아 주세요. 다음에 제가 요청하는 수정부터 이어서 진행해 주세요.
