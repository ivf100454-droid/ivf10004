-- 이 파일은 `prisma migrate dev`가 생성한 마이그레이션 SQL 뒤에 그대로 이어 붙여
-- 실행할 raw SQL이다. Prisma 스키마 문법은 WHERE 절이 있는 partial unique index를
-- 표현할 수 없으므로 이 두 제약은 별도로 추가한다. (Prisma 공식 문서: 마이그레이션
-- 파일은 배포 전 수동 편집 가능 — "Customizing migrations")

-- 1) login_id는 "활성 계정"에서만 유일해야 한다 (6~7번 요구사항).
--    퇴원 후 disabled 처리된 계정의 login_id는 새 학생에게 재사용 가능해야 하므로
--    전체 컬럼에 UNIQUE를 걸지 않고 WHERE 절로 범위를 좁힌다.
CREATE UNIQUE INDEX IF NOT EXISTS ux_student_accounts_login_id_active
  ON student_accounts (login_id)
  WHERE account_status = 'enabled';

-- 2) 한 assigned_checklist_item에는 current 상태의 submission이 최대 1개만
--    존재해야 한다 (18번 요구사항). 재제출 시 기존 것을 superseded로 바꾸는
--    트랜잭션과 함께, 동시 요청에 의한 경쟁상태를 이 인덱스가 최종 방어한다.
CREATE UNIQUE INDEX IF NOT EXISTS ux_audio_submissions_current_per_item
  ON audio_submissions (assigned_item_id)
  WHERE status = 'current';
