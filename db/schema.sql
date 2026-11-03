-- 오늘의 생활법원 — 사건 기록 스키마 (Postgres / Supabase)
-- backend는 DATABASE_URL이 설정된 경우 이 테이블에 사건을 저장한다.

CREATE TABLE IF NOT EXISTS cases (
  seq          INTEGER PRIMARY KEY,          -- 사건 시퀀스 (42부터 시작)
  case_no      TEXT NOT NULL,                -- 표시용 사건번호 예: "2026 생활 제042호"
  story        TEXT NOT NULL,                -- 사연 (10~300자)
  case_type    TEXT NOT NULL,                -- work | relationship | meal | messenger | money | romance | daily
  relationship TEXT NOT NULL,                -- self | colleague | friend | family | lover | neighbor | boss | anonymous
  severity     SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  tone         TEXT NOT NULL,                -- lenient | fair | strict
  filing_kind  TEXT NOT NULL,                -- complaint(고소) | accusation(고발)
  verdict      JSONB NOT NULL,               -- 제1심 판결문
  complaint    JSONB NOT NULL,               -- 고소장/고발장
  appeal       JSONB,                        -- 항소심 판결문 (항소 시)
  supreme      JSONB,                        -- 대법원 상고심 판결문 (원고가 원할 때, 항소심 이후 1회)
  countersuit  JSONB,                        -- 맞고소장 (맞고소 시)
  response     JSONB,                        -- 피고 측 답변서 (공유 링크 수신자가 선택지로 제출)
  share_token  TEXT,                         -- 192-bit random bearer token (shared read/response)
  owner_token  TEXT,                         -- separate owner-only mutation token
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기존 배포 DB에는 backend가 부팅 시 멱등 마이그레이션으로 추가한다:
-- ALTER TABLE cases ADD COLUMN IF NOT EXISTS response JSONB;
-- ALTER TABLE cases ADD COLUMN IF NOT EXISTS supreme JSONB;

CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases (created_at DESC);

CREATE TABLE IF NOT EXISTS case_counters (
  id TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
