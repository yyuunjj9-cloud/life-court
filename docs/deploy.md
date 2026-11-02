# 배포 구성 (2026-08-21)

## 사건 권한 및 저장소 변경 (2026-11-02)

- 사건번호는 `case_counters`의 원자적 UPSERT로 예약한다. 번호 미리보기는 예약하지 않는다. 실패한 접수는 번호 공백을 남길 수 있다.
- 답변서는 `response IS NULL` 조건의 단일 UPDATE로 접수한다. 동시 제출 중 한 요청만 성공한다.
- 접수 시 공유용·접수자용 토큰을 각각 192비트 난수로 발급한다. 공유 조회에는 접수자 토큰·원문 입력을 반환하지 않는다. 항소·맞고소는 `X-Owner-Token`이 필요하다.
- 서버는 `response`, `share_token`, `owner_token` 컬럼과 `case_counters` 테이블을 준비한 후에만 요청을 받는다. 기존 판결 데이터는 수정하지 않는다.
- **기존 해시 기반 `/s/번호-토큰` 링크는 보안 강화 후 사용할 수 없다.** 기존 브라우저에 보관된 문서는 이미지 저장·공유가 가능하지만, 접수자 토큰 없는 과거 사건의 추가 항소·맞고소는 제한된다. 새 사건부터 새 링크를 제공한다. 입력을 담는 구형 `/shared` 재현 링크는 별개다.
- 배포는 백엔드부터 완료하고 health 확인 후 프론트를 배포한다. 전환 중 구버전 프론트는 새 공유 링크·추가 처분을 사용할 수 없으므로 새로고침해야 한다.
- 검증: `cd backend && npm test`; 운영 DB를 대상으로 자동 테스트를 실행하지 않는다.

```
브라우저 ──▶ Vercel (frontend) ──fetch──▶ Render (backend API) ──SQL──▶ Supabase Postgres
```

| 티어 | 서비스 | URL / 식별자 |
|---|---|---|
| 프론트 | Vercel `claudeclass/life-court` | https://life-court.vercel.app |
| 백엔드 | Render `life-court-api` (free, singapore) | https://life-court-api.onrender.com · `srv-da402fn40ujc73chjqdg` |
| DB | Supabase "AX 워크톤" 프로젝트 재사용 | ref `dcoqtgyaewrctiwlbbub` (ap-northeast-1) · 스키마 `lifecourt` |

## DB 구성 방식

무료 플랜의 활성 프로젝트 2개 제한 때문에 **기존 프로젝트(AX 워크톤)를 재사용**한다.
기존 앱과 격리하기 위해 별도 로그인 role과 스키마를 만들었다:

- role: `lifecourt` (LOGIN, `search_path=lifecourt` 고정) — 기존 DB 비밀번호는 건드리지 않음
- schema: `lifecourt` — `cases` 테이블 하나 (`db/schema.sql`과 동일 구조, `lifecourt` 스키마에 생성)
- 접속: Session Pooler `aws-0-ap-northeast-1.pooler.supabase.com:5432`,
  user `lifecourt.dcoqtgyaewrctiwlbbub`, `?sslmode=require&uselibpqcompat=true`
- role 비밀번호는 **Render 환경변수 `DATABASE_URL`에만 존재**한다

정리하려면: `drop schema lifecourt cascade; drop role lifecourt;` (기존 앱에 영향 없음)

## 환경변수

| 위치 | 키 | 값 |
|---|---|---|
| Render | `DATABASE_URL` | Supabase Session Pooler URI (비밀) |
| Render | `CORS_ORIGINS` | `https://life-court.vercel.app` |
| Render | `CORS_ORIGIN_REGEX` | `https://life-court-[a-z0-9]+-claudeclass\.vercel\.app` (프리뷰용) |
| Vercel | `NEXT_PUBLIC_API_URL` (production) | `https://life-court-api.onrender.com` |

## 재배포 방법

```bash
# 백엔드 수동 재배포 (2026-11-02 서비스 API 확인: main push 자동 배포도 활성화됨)
render deploys create srv-da402fn40ujc73chjqdg --confirm

# 프론트
cd frontend && vercel deploy --prod --yes
```

현재 Vercel도 GitHub main 브랜치에 연결되어 있다. API 계약을 바꿀 때는 백엔드 변경을 먼저 push하고 Render의 live/health 상태를 확인한 뒤 프론트 변경을 push한다.

Render 환경변수 변경은 REST(PUT `/v1/services/<srv>/env-vars`, 전체 치환이므로 기존 값 병합) 후 재배포.

## keep-alive (이중화)

health가 DB를 실제 조회(`SELECT 1`)하므로 핑 하나로 Render 스핀다운(15분 유휴)과
Supabase 무료 프로젝트 정지(7일 무활동)를 모두 방지한다. 핑은 두 경로로 이중화돼 있다:

1. **Supabase pg_cron (주 경로)** — DB 안에서 10분마다 `net.http_get`으로 백엔드 health를 호출.
   GitHub 스케줄과 달리 지연이 거의 없다.
   - 잡 확인: `select * from cron.job;` (jobname `lifecourt-keepalive`)
   - 실행 이력: `select * from cron.job_run_details order by start_time desc limit 5;`
   - 해제: `select cron.unschedule('lifecourt-keepalive');`
2. **GitHub Actions (보조)** — `.github/workflows/keepalive.yml`, 10분 간격(실제로는 수십 분 지연 가능).
   - 대상 URL 변경: 리포 Settings → Variables → `KEEPALIVE_URL`
   - 리포에 60일간 커밋이 없으면 자동 비활성화 → Actions 탭에서 Enable
   - 수동 실행: `gh workflow run keepalive.yml`

## 무료 티어 한계

- Render free: 15분 유휴 시 스핀다운(첫 요청 콜드스타트 최대 1분 — 프론트에 안내 배너 있음), 월 750시간(워크스페이스 공유)
- Supabase free: 7일 무활동 시 일시정지, 500MB
- Vercel Hobby: 비상업 용도 한정
