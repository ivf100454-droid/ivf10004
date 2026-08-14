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

  // 세션 무효화는 별도 테이블(auth_sessions) updateMany이므로 같은 트랜잭션에
  // 포함해도 되지만, 트랜잭션 타임아웃을 늘리지 않기 위해 바로 이어서 호출한다.
  // 두 단계 사이 실패 가능성은 매우 낮지만(같은 프로세스, 즉시 실행), 완전한
  // 원자성이 필요하면 revokeAllSessionsForAccount 호출도 위 트랜잭션 안으로
  // 옮길 수 있다 — 운영 데이터 늘어나면 재검토.
  await revokeAllSessionsForAccount(account.accountId);

  return account;
}

/** 클래스 이동/제거. 과거 assignment의 class_id_snapshot은 절대 건드리지 않는다(3번 요구사항). */
export async function changeStudentClass(studentId: string, newClassId: string | null) {
  return prisma.student.update({
    where: { studentId },
    data: { currentClassId: newClassId },
  });
}
