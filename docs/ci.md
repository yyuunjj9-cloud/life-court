# 자동 검사와 Postgres 동시성 검증

`.github/workflows/ci.yml`은 push, pull request, 수동 실행 시 다음을 순서대로 검사한다.

1. lockfile에 고정된 프론트·백엔드 의존성 설치
2. 일반 회귀 테스트 및 메모리 API 테스트
3. 실제 Postgres 16에서 번호 발급·답변서 접수 동시성 및 마이그레이션 검증
4. 양쪽 TypeScript 검사
5. 양쪽 프로덕션 빌드

Node.js는 운영과 같은 24를 사용한다. 공식 GitHub Actions를 커밋 SHA로 고정하고 권한은 `contents: read`만 부여한다. 기존 keepalive 워크플로는 그대로 유지한다.

## DB 격리

- GitHub runner 안의 일회용 Postgres 컨테이너만 사용한다. 운영 Supabase URL이나 비밀값은 필요 없다.
- `TEST_DATABASE_URL`만 읽으며 `DATABASE_URL`로 대체하지 않는다. URL이 없으면 테스트가 실패하므로 CI에서 DB 검증이 조용히 생략되지 않는다.
- loopback 주소와 `lifecourt_test`라는 DB 이름만 허용한다. 각 테스트는 임의 이름의 별도 스키마에서 수행하고 종료 시 자기 스키마만 삭제한다.
- 3개의 독립 연결 풀에서 120건을 동시에 발급·저장하고, 답변서 100건 중 1건만 저장되는지 확인한다.
- 미리보기의 비소모성, 연결 재시작 후 예약 번호 유지, 기존 문서·토큰을 보존한 동시 초기화도 검사한다.

최초 실제 DB 실행에서 동시 초기화의 `CREATE TABLE IF NOT EXISTS`가 시스템 카탈로그 중복 키로 실패하는 것을 재현했다. 초기화는 같은 연결의 트랜잭션과 스키마별 advisory lock으로 직렬화한다. 번호 발급과 답변서 접수는 각자의 원자적 SQL을 유지한다.

## 로컬 실행

양쪽 의존성을 먼저 설치한 후 루트에서 `npm test`, `npm run typecheck`, `npm run build`를 실행한다.

Postgres 테스트는 별도 `lifecourt_test` DB가 있는 로컬 Postgres가 필요하다.

```powershell
$env:TEST_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/lifecourt_test'
npm.cmd run test:postgres
```

GitHub Actions가 테스트 결과를 보고하는 것과 main 병합·자동 배포를 강제로 막는 것은 별개다. 이 변경은 자동 검사만 추가하며 브랜치 보호나 기존 배포 설정을 바꾸지 않는다.
