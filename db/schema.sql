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
  scenario     TEXT,                         -- 사건 확인 화면에서 고른 사건명(general = 해당 없음). 없으면 재판부 판단
  confirm      TEXT,                         -- 확인 결과 종류: kept | alternative | general | none (통계용, 사연 내용 아님)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기존 배포 DB에는 backend가 부팅 시 멱등 마이그레이션으로 추가한다:
-- ALTER TABLE cases ADD COLUMN IF NOT EXISTS response JSONB;
-- ALTER TABLE cases ADD COLUMN IF NOT EXISTS supreme JSONB;
-- ALTER TABLE cases ADD COLUMN IF NOT EXISTS scenario TEXT, ADD COLUMN IF NOT EXISTS confirm TEXT;

CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases (created_at DESC);

CREATE TABLE IF NOT EXISTS case_counters (
  id TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

-- 생활 배심원단 — 공유 링크를 받은 사람의 유·무죄 투표. 판결을 바꾸지 않는 참고 의견이다.
-- voter는 기기마다 만든 난수라 개인을 알아볼 수 없다. 같은 사건에 같은 기기는 한 표.
CREATE TABLE IF NOT EXISTS jury_votes (
  seq        INTEGER NOT NULL,
  voter      TEXT NOT NULL,
  vote       TEXT NOT NULL CHECK (vote IN ('guilty', 'not_guilty')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (seq, voter)
);

-- 안내 페이지 업데이트 메모판의 이용자 아이디어. 공개 요청(pending)은 운영자가
-- 승인(approved)해야만 보이고, 비공개(private)는 운영자만 본다.
CREATE TABLE IF NOT EXISTS ideas (
  id          SERIAL PRIMARY KEY,
  text        TEXT NOT NULL,                 -- 2~60자, 금칙어 검사 통과분만 저장
  nickname    TEXT,                          -- 선택 별명 (10자, 운영 측으로 오해할 이름 금지)
  status      TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'private')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
