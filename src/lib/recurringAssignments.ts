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
  const existing = await getActiveRecurring(
    params.targetType,
    params.targetType === "student" ? params.studentId! : params.classId!
  );

  if (existing && existing.templateId === params.templateId) {
    return { recurringAssignment: existing, changed: false };
  }

  const today = todayDate();

  if (existing) {
    await prisma.recurringAssignment.update({
      where: { recurringAssignmentId: existing.recurringAssignmentId },
      data: { status: "ended", endDate: today },
    });
  }

  const created = await prisma.recurringAssignment.create({
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

  return { recurringAssignment: created, previousEnded: existing ?? null, changed: true };
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
