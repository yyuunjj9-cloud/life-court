# 배포 구성 (2026-08-21)

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
# 백엔드 (CLI 생성 서비스라 push 자동 배포가 연결돼 있지 않음)
render deploys create srv-da402fn40ujc73chjqdg --confirm

# 프론트
cd frontend && vercel deploy --prod --yes
```

Render 환경변수 변경은 REST(PUT `/v1/services/<srv>/env-vars`, 전체 치환이므로 기존 값 병합) 후 재배포.

## keep-alive

`.github/workflows/keepalive.yml` — 10분 간격으로 `/api/health`를 호출한다.
health가 DB를 실제 조회(`SELECT 1`)하므로 이 핑 하나로 Render 스핀다운(15분 유휴)과
Supabase 무료 프로젝트 정지(7일 무활동)를 모두 방지한다.

- 대상 URL 변경: 리포 Settings → Variables → `KEEPALIVE_URL`
- 리포에 60일간 커밋이 없으면 GitHub가 스케줄을 자동 비활성화 → Actions 탭에서 Enable
- 수동 실행: `gh workflow run keepalive.yml`

## 무료 티어 한계

- Render free: 15분 유휴 시 스핀다운(첫 요청 콜드스타트 최대 1분 — 프론트에 안내 배너 있음), 월 750시간(워크스페이스 공유)
- Supabase free: 7일 무활동 시 일시정지, 500MB
- Vercel Hobby: 비상업 용도 한정
