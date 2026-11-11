import { prisma } from "@/lib/db";
import { getAcademyToday } from "@/lib/timezone";

type TargetType = "student" | "class";

function todayDate(): Date {
  return new Date(`${getAcademyToday()}T00:00:00.000Z`);
}

/** 학생 또는 클래스에 걸린 "현재 활성" 반복배정 1건을 가져온다 (보통 대상당 최대 1개를 가정). */
export async function getActiveRecurring(targetType: TargetType, targetId: string) {
  return prisma.recurringAssignment.findFirst({
    where:
      targetType === "student"
        ? { targetType: "student", studentId: targetId, status: "active" }
        : { targetType: "class", classId: targetId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 학생/클래스에 템플릿을 반복배정으로 "시작"한다.
 * - 이미 같은 템플릿으로 활성 배정이 있으면 그대로 반환한다 (중복 생성 안 함).
 * - 다른 템플릿으로 활성 배정이 있으면 그 배정을 "종료" 처리하고 새로 시작한다
 *   (과거 기록은 그대로 유지 — 종료는 소프트 삭제).
 */
export async function startOrReplaceRecurring(params: {
  targetType: TargetType;
  studentId?: string;
  classId?: string;
  templateId: string;
  createdByAdminId?: string | null;
  activeDays?: number[];
}) {
  const targetId = params.targetType === "student" ? params.studentId! : params.classId!;
  const today = todayDate();

  // 같은 대상(학생/반)에 대한 배정 요청이 동시에 들어와도(버튼 연타 등) 한 번에 하나씩만
  // 처리되도록 DB 잠금을 건다. 잠금이 없으면 두 요청이 모두 "기존 배정"을 같이 보고
  // 각자 새 활성 배정을 만들어, 활성 배정이 여러 개 생기는 문제가 있었다.
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"recurring:" + params.targetType + ":" + targetId}))`;

    const actives = await tx.recurringAssignment.findMany({
      where:
        params.targetType === "student"
          ? { targetType: "student", studentId: targetId, status: "active" }
          : { targetType: "class", classId: targetId, status: "active" },
      orderBy: { createdAt: "desc" },
    });
    const existing = actives[0] ?? null;

    if (existing && actives.length === 1 && existing.templateId === params.templateId) {
      return { recurringAssignment: existing, previousEnded: null, changed: false };
    }

    // 활성 배정은 대상당 1개여야 하므로, 기존 활성 배정은 "전부" 종료한다.
    if (actives.length > 0) {
      await tx.recurringAssignment.updateMany({
        where: { recurringAssignmentId: { in: actives.map((a) => a.recurringAssignmentId) } },
        data: { status: "ended", endDate: today },
      });
    }

    const created = await tx.recurringAssignment.create({
      data: {
        targetType: params.targetType,
        studentId: params.targetType === "student" ? params.studentId : null,
        classId: params.targetType === "class" ? params.classId : null,
        templateId: params.templateId,
        startDate: today,
        activeDays: params.activeDays ?? [0, 1, 2, 3, 4, 5, 6],
        status: "active",
        createdByAdminId: params.createdByAdminId ?? null,
      },
    });

    return { recurringAssignment: created, previousEnded: existing, changed: true };
  });
}

/** 학생/반에 걸린 활성 반복배정을 "전부" 종료한다 (중복으로 여러 개 생긴 경우까지 정리). */
export async function endAllActiveRecurring(targetType: TargetType, targetId: string) {
  return prisma.recurringAssignment.updateMany({
    where:
      targetType === "student"
        ? { targetType: "student", studentId: targetId, status: "active" }
        : { targetType: "class", classId: targetId, status: "active" },
    data: { status: "ended", endDate: todayDate() },
  });
}

/** 반복배정을 종료한다 (소프트 삭제 — 과거에 생성된 일일 체크리스트는 그대로 보존). */
export async function endRecurring(recurringAssignmentId: string) {
  return prisma.recurringAssignment.update({
    where: { recurringAssignmentId },
    data: { status: "ended", endDate: todayDate() },
  });
}

/** 반복배정을 일시정지한다 (오늘부터 자동 생성 중단, 기존 기록은 그대로 유지). */
export async function pauseRecurring(recurringAssignmentId: string) {
  return prisma.recurringAssignment.update({
    where: { recurringAssignmentId },
    data: { status: "paused" },
  });
}

/** 일시정지된 반복배정을 재개한다. */
export async function resumeRecurring(recurringAssignmentId: string) {
  return prisma.recurringAssignment.update({
    where: { recurringAssignmentId },
    data: { status: "active" },
  });
}

/** 적용 요일을 변경한다 (0=일 ~ 6=토). */
export async function updateActiveDays(recurringAssignmentId: string, activeDays: number[]) {
  return prisma.recurringAssignment.update({
    where: { recurringAssignmentId },
    data: { activeDays },
  });
}
