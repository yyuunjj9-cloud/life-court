# db — 사건 기록 데이터베이스

Postgres(권장: Supabase 무료 티어) 스키마입니다.

## 적용 방법

```bash
# Supabase SQL Editor에 schema.sql 내용을 붙여넣어 실행하거나,
psql "$DATABASE_URL" -f db/schema.sql
```

## 백엔드 연결

`backend/.env`에 연결 문자열을 설정하면 사건이 DB에 저장됩니다.

```
DATABASE_URL=postgresql://user:password@host:5432/postgres
```

`DATABASE_URL`이 비어 있으면 백엔드는 **인메모리 저장소**로 동작합니다(로컬 개발용 — 서버 재시작 시 사건 기록이 사라집니다).
