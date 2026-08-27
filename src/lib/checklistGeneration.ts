import { prisma } from "@/lib/db";
import { getAcademyToday, getWeekday } from "@/lib/timezone";
import { Prisma } from "@prisma/client";

/**
 * 반복배정(RecurringAssignment) 1건에 대해, 특정 학생의 "오늘" 일일 체크리스트가 아직
 * 없으면 생성한다. 이미 있으면 아무것도 하지 않는다 (진행 중인 기록을 절대 건드리지 않음).
 *
 * 중복 생성 방지는 두 겹으로 처리한다:
 *   1) 생성 전 존재 여부 조회 (일반적인 경우 여기서 걸러짐)
 *   2) DB 유니크 제약 (studentId, recurringAssignmentId, checklistDate) — 서버 작업이
 *      겹치거나 재실행돼도 최종적으로 중복 행이 생기지 않도록 보장한다. 유니크 위반이
 *      나면 "이미 누군가 만들었다"는 뜻이므로 조용히 무시한다.
 *
 * 반환값: 실제로 새로 생성했으면 true.
 */
async function ensureAssignmentForRecurring(
  ra: {
    recurringAssignmentId: string;
    templateId: string;
    targetType: string;
  },
  studentId: string,
  studentSnapshot: { currentClassId: string | null; className: string | null }
): Promise<boolean> {
  const todayStr = getAcademyToday();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  const existing = await prisma.checklistAssignment.findFirst({
    where: { studentId, recurringAssignmentId: ra.recurringAssignmentId, checklistDate: todayDate },
    select: { assignmentId: true },
  });
  if (existing) return false;

  const template = await prisma.checklistTemplate.findUnique({
    where: { templateId: ra.templateId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return false;

  // 표시용 일련번호를 원자적으로 하나 증가시켜 발급받는다.
  const updatedRa = await prisma.recurringAssignment.update({
    where: { recurringAssignmentId: ra.recurringAssignmentId },
    data: { sequenceCounter: { increment: 1 } },
    select: { sequenceCounter: true },
  });

  try {
    await prisma.checklistAssignment.create({
      data: {
        studentId,
        checklistDate: todayDate,
        classIdSnapshot: studentSnapshot.currentClassId,
        classNameSnapshot: studentSnapshot.className,
        sourceTemplateId: template.templateId,
        templateVersion: template.version,
        recurringAssignmentId: ra.recurringAssignmentId,
        sequenceNumber: updatedRa.sequenceCounter,
        // 기존 화면의 "🏫 반 기본" / "➕ 개별 추가" 라벨과 호환되도록 그대로 매핑한다.
        standingSource: ra.targetType === "class" ? "class" : "individual",
        createdByAdminId: null, // 시스템 자동 생성
        items: {
          create: template.items.map((item) => ({
            title: item.title,
            sortOrder: item.sortOrder,
            isProgressItem: item.isProgressItem,
            hasCheck: item.hasCheck,
            hasCount: item.hasCount,
            targetCount: item.targetCount,
            hasScore: item.hasScore,
            maxScore: item.maxScore,
            linkUrl: item.linkUrl,
            linkLabel: item.linkLabel,
            teachingVideoId: item.teachingVideoId,
            hasPhotoSubmission: item.hasPhotoSubmission,
            hasAudioSubmission: item.hasAudioSubmission,
            hasVideoSubmission: item.hasVideoSubmission,
            hasFileSubmission: item.hasFileSubmission,
            requiredFeatures: item.requiredFeatures as any,
          })),
        },
      },
    });
    return true;
  } catch (err) {
    // P2002: 유니크 제약 위반 = 동시 실행 등으로 이미 다른 요청이 방금 생성함 → 정상 상황으로 간주.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return false;
    }
    throw err;
  }
}

/** 학생 1명에게 오늘 적용되는 활성 반복배정 목록(개별 + 소속 반)을 가져온다. */
async function getApplicableRecurringAssignments(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { studentId },
    include: { currentClass: true },
  });
  if (!student || student.studentStatus === "withdrawn") return { student: null, recurring: [] as any[] };

  const todayStr = getAcademyToday();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
  const weekday = getWeekday(todayStr);

  const targetFilters: Prisma.RecurringAssignmentWhereInput[] = [
    { targetType: "student", studentId: student.studentId },
  ];
  if (student.currentClassId) {
    targetFilters.push({ targetType: "class", classId: student.currentClassId });
  }

  const recurring = await prisma.recurringAssignment.findMany({
    where: {
      status: "active",
      startDate: { lte: todayDate },
      OR: [{ endDate: null }, { endDate: { gte: todayDate } }],
      AND: [{ OR: targetFilters }],
    },
  });

  const applicableToday = recurring.filter((ra) => ra.activeDays.includes(weekday));

  return { student, recurring: applicableToday };
}

/**
 * 학생의 "오늘" 체크리스트를, 적용되는 모든 활성 반복배정(개별 + 소속 반) 기준으로
 * 자동 생성한다. 반/개별은 서로 다른 반복배정이므로 함께 존재할 수 있다.
 * 이미 오늘 생성된 배정은 절대 건드리지 않는다 — 진행 중인 체크/점수/제출 기록 보존.
 */
export async function ensureTodayAssignment(studentId: string): Promise<void> {
  const { student, recurring } = await getApplicableRecurringAssignments(studentId);
  if (!student) return;

  for (const ra of recurring) {
    await ensureAssignmentForRecurring(
      ra,
      student.studentId,
      { currentClassId: student.currentClassId, className: student.currentClass?.name ?? null }
    );
  }
}

/**
 * 반 전체(퇴원 제외) 학생에게, 이 반에 걸린 활성 반복배정 기준 "오늘" 체크리스트를 생성한다
 * (없는 학생만). 학생이 개별 반복배정을 갖고 있어도 반 배정은 별개로 그대로 받는다.
 * 반환값: 실제로 오늘자 반 배정이 새로 생성된 (학생, 반복배정) 조합 수.
 */
export async function ensureTodayAssignmentsForClass(classId: string): Promise<number> {
  const todayStr = getAcademyToday();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
  const weekday = getWeekday(todayStr);

  const classRecurring = await prisma.recurringAssignment.findMany({
    where: {
      targetType: "class",
      classId,
      status: "active",
      startDate: { lte: todayDate },
      OR: [{ endDate: null }, { endDate: { gte: todayDate } }],
    },
  });
  const applicableToday = classRecurring.filter((ra) => ra.activeDays.includes(weekday));
  if (applicableToday.length === 0) return 0;

  const students = await prisma.student.findMany({
    where: { currentClassId: classId, studentStatus: { not: "withdrawn" } },
    select: { studentId: true, currentClassId: true, currentClass: { select: { name: true } } },
  });

  let createdCount = 0;
  for (const s of students) {
    for (const ra of applicableToday) {
      const created = await ensureAssignmentForRecurring(ra, s.studentId, {
        currentClassId: s.currentClassId,
        className: s.currentClass?.name ?? null,
      });
      if (created) createdCount += 1;
    }
  }
  return createdCount;
}
