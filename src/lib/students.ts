import { prisma } from "./db";
import { hashPassword, revokeAllSessionsForAccount } from "./auth";

/**
 * 학생 등록: students + student_accounts를 한 트랜잭션으로 생성한다.
 * 하나라도 실패하면 전체 롤백되어, 계정 없는 고아 student 레코드가 남지 않는다(5번 요구사항).
 * login_id 활성 유일성은 DB의 partial unique index가 최종 보장하므로,
 * 여기서 실패하면 Prisma가 P2002(unique constraint violation) 에러를 던진다 —
 * 호출부에서 이를 잡아 "이미 사용 중인 아이디입니다"로 변환해야 한다.
 */
export async function registerStudent(params: {
  name: string;
  loginId: string;
  initialPassword: string;
  classId?: string | null;
}) {
  const passwordHash = await hashPassword(params.initialPassword);

  return prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        name: params.name,
        studentStatus: "active",
        currentClassId: params.classId ?? null,
      },
    });

    const account = await tx.studentAccount.create({
      data: {
        studentId: student.studentId,
        loginId: params.loginId,
        passwordHash,
        accountStatus: "enabled",
      },
    });

    return { student, account };
  });
}

/**
 * 퇴원 처리: student_status=withdrawn, account_status=disabled, 모든 세션 무효화를
 * 하나의 트랜잭션 + 후속 처리로 원자적으로 수행한다(8번, 36-19번 요구사항).
 * login_id는 여기서 그대로 두되(계정 행 삭제 안 함), account_status가 disabled가
 * 되는 순간부터 partial unique index 범위에서 벗어나 재사용 가능해진다.
 */
export async function withdrawStudent(studentId: string) {
  const account = await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: { studentId },
      data: { studentStatus: "withdrawn" },
    });

    const account = await tx.studentAccount.update({
      where: { studentId },
      data: { accountStatus: "disabled", disabledAt: new Date() },
    });

    return account;
  });

  await revokeAllSessionsForAccount(account.accountId);

  return account;
}

/**
 * 완전 삭제(영구 삭제): 퇴원 처리된 학생만 대상으로, 계정·배정·제출 기록까지
 * 전부 지우는 되돌릴 수 없는 작업이다. 실수로 재학생을 지우는 사고를 막기 위해
 * 호출부(API)에서 studentStatus === "withdrawn"인지 반드시 먼저 확인해야 한다.
 *
 * 삭제 순서(외래키 제약 때문에 순서가 중요하다):
 * 1) checklist_assignments 삭제 → 하위 assigned_items·제출 기록은 DB의
 *    onDelete: Cascade로 자동 삭제된다.
 * 2) student_accounts 삭제 → 하위 auth_sessions는 Cascade로 자동 삭제된다.
 * 3) students 삭제 → share_links는 Cascade로 자동 삭제된다.
 *
 * 실제로 업로드된 파일(R2에 저장된 원본)은 이 함수에서 지우지 않는다 —
 * DB 레코드만 정리하고, 스토리지 정리는 별도 배치 작업의 몫으로 남겨둔다.
 */
export async function hardDeleteStudent(studentId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.checklistAssignment.deleteMany({ where: { studentId } });
    await tx.studentAccount.deleteMany({ where: { studentId } });
    await tx.student.delete({ where: { studentId } });
  });
}

/** 클래스 이동/제거. 과거 assignment의 class_id_snapshot은 절대 건드리지 않는다(3번 요구사항). */
export async function changeStudentClass(studentId: string, newClassId: string | null) {
  return prisma.student.update({
    where: { studentId },
    data: { currentClassId: newClassId },
  });
}

/**
 * 비밀번호 재설정. 실제 비밀번호는 해시로만 저장되어 있어 "찾기"가 불가능하므로,
 * 학생이 잊어버렸다고 하면 관리자가 새 비밀번호를 정해서(또는 자동생성해서) 이걸로
 * 교체하는 방식만 가능하다. 기존 로그인 세션은 전부 무효화해 새 비밀번호로만 재로그인하게 한다.
 */
export async function resetStudentPassword(studentId: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);

  const account = await prisma.studentAccount.update({
    where: { studentId },
    data: { passwordHash },
  });

  await revokeAllSessionsForAccount(account.accountId);

  return account;
}
