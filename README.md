# 영어학원 체크리스트 앱 — Phase 5 첫 구현 배치

이 배치는 42번(권장 개발 순서)의 1~9번(데이터 모델 ~ 스토리지/파일 접근권한 골격)과
10~13번 일부(관리자/학생/클래스 기본 CRUD)를 다룹니다. 아직 체크리스트
기능(항목 CRUD, 완료 로직, 음성 제출)은 포함하지 않았습니다 — 46번 원칙에 따라
DB·인증·접근권한이 먼저 검증되어야 그 위에 안전하게 쌓을 수 있기 때문입니다.

## 실행 방법

```bash
npm install
cp .env.example .env   # DATABASE_URL을 실제 PostgreSQL 접속정보로 수정
npx prisma migrate dev --name init
# 마이그레이션 직후, prisma/migrations/0001_init/after_prisma_migrate.sql의
# 내용을 생성된 migration.sql 파일 맨 아래에 수동으로 이어붙이고 다시 적용하거나,
# psql로 별도 실행하세요 (partial unique index는 Prisma 스키마 문법으로 표현 불가).
npm run dev
```

## 이번 배치에서 구현한 것

- Prisma 스키마: Phase 2 ERD의 모든 테이블 (students, student_accounts, classes,
  checklist_assignments, assigned_checklist_items, audio_submissions, file_metadata,
  auth_sessions, idempotency_keys 등)
- login_id 활성 유일성 partial unique index (raw SQL)
- audio_submissions의 assigned_item당 current 유일성 partial unique index (raw SQL)
- 비밀번호 해시(bcrypt) 및 검증
- DB 기반 세션 생성/검증/무효화 (`lib/auth.ts`)
- 학생 등록 트랜잭션 (student + account 원자적 생성, `lib/students.ts`)
- 퇴원 처리 트랜잭션 (student_status + account_status + 세션 무효화, `lib/students.ts`)
- 로그인/로그아웃 API (`/api/auth/login`, `/api/auth/logout`)
- 클래스 목록/생성/삭제 API — 삭제 시 소속 학생 수에 따른 강한 확인 플로우
- 학생 목록/등록/퇴원 API
- Asia/Seoul 기준 "오늘" 판정 유틸 (`lib/timezone.ts`) — 아직 어떤 API도 이걸
  써서 실제 권한 판정을 하고 있지는 않음(다음 배치인 체크리스트 배정/제출 기능에서 사용 예정)
- Next.js 미들웨어: `/api/student/*` 경로에 쿠키 존재 여부 1차 체크 (실제 세션
  유효성은 각 라우트가 `validateSession()`으로 재검증하는 구조)

## 실제로 테스트한 것

**아무것도 테스트하지 않았습니다.** 이 배치는 코드 생성까지만 진행되었고,
`npm install`도 실행되지 않았습니다(패키지 설치·DB 연결·마이그레이션 실행은
로컬/서버 환경이 필요). 46번 원칙("실행하지 않은 테스트를 테스트 완료라고
말하지 않는다")에 따라 명확히 밝힙니다.

## 아직 테스트하지 않은 것 (전부)

- `npx prisma migrate dev`가 실제로 스키마를 정상 생성하는지
- partial unique index가 의도대로 동작하는지 (활성 계정 login_id 중복 시도,
  동시 재제출 시도)
- 로그인/로그아웃 API가 실제 쿠키를 주고받으며 정상 동작하는지
- 학생 등록 트랜잭션이 실패 시 정말 롤백되는지 (예: 잘못된 classId로 FK 위반 유도)
- 퇴원 처리 후 기존 세션으로 API를 호출하면 실제로 401이 나는지
- TypeScript 컴파일이 에러 없이 통과하는지 (`tsc --noEmit`도 아직 실행 안 함)

## (추가 배치) 관리자 인증

이전 배치의 1순위 위험이었던 관리자 인증을 이번 배치에서 추가했습니다.

- `admin_sessions` 테이블 신설 (학생용 `auth_sessions`와 분리 — 서로 다른 주체를
  같은 테이블에서 다루면 나중에 매번 분기해야 해서 혼동 위험이 커지기 때문)
- `/api/admin/auth/login`, `/api/admin/auth/logout` 라우트 추가
- 기존 `/api/classes`, `/api/students` 관련 라우트를 `/api/admin/classes`,
  `/api/admin/students`로 이동하고, 각 핸들러에 `getAdminFromRequest()` 가드 추가
- 미들웨어가 `/api/admin/*`(로그인 제외)에 대해서도 쿠키 존재 여부 1차 체크

**주의**: `administrators` 테이블에 아직 관리자 계정을 만드는 API/시딩 스크립트가
없습니다. 지금 상태로는 로그인할 계정 자체가 DB에 없어 `/api/admin/auth/login`이
항상 401을 반환합니다 — 다음 배치에서 관리자 계정 시딩(또는 최초 설정 마법사)을
추가해야 합니다.

## 남은 위험 (갱신)

- **관리자 계정을 생성하는 방법이 아직 없습니다** (위 주의사항 참조) — 현재
  최우선 위험입니다.
- 미들웨어는 Edge 런타임 제약으로 쿠키 존재 여부만 확인하고, 실제 세션
  유효성(revoked/expired)은 각 API route handler가 재검증합니다. 이 이중 구조를
  잘못 이해하고 미들웨어 통과만으로 "인증됨"이라 가정하는 코드를 나중에 추가하면
  안 됩니다.
- 여전히 아무 코드도 실행/테스트하지 않았습니다 (`npm install`, DB 연결,
  로그인 흐름 전부 미검증) — 46번 원칙에 따라 명시합니다.
- Cloudflare R2 연동(파일 업로드, signed URL)은 아직 코드가 없습니다.
- 브라우저 `MediaRecorder` 지원 형식은 구현 시점에 MDN/공식 문서로 재확인 필요.
- 관리자 간 권한 차등은 MVP 범위 밖이므로, 로그인만 되면 모든 관리자 API에
  동일하게 접근 가능합니다(2번 요구사항대로 의도된 동작입니다).

## 다음 배치 제안

관리자 계정 시딩 스크립트 → 체크리스트 템플릿/배정 API → 항목별 완료 로직
(`evaluateCompletion`) → 진행률 계산 → 음성 녹음/제출(R2 연동) 순으로 진행하는
것을 제안합니다(42번 순서 기준).
