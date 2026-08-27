import { prisma } from "@/lib/db";
import { getAcademyToday } from "@/lib/timezone";

type TemplateForCopy = {
  templateId: string;
  items: {
    title: string;
    sortOrder: number;
    isProgressItem: boolean;
    hasCheck: boolean;
    hasCount: boolean;
    targetCount: number | null;
    hasScore: boolean;
    maxScore: number | null;
    linkUrl: string | null;
    linkLabel: string | null;
    teachingVideoId: string | null;
    hasPhotoSubmission: boolean;
    hasAudioSubmission: boolean;
    hasVideoSubmission: boolean;
    hasFileSubmission: boolean;
    requiredFeatures: unknown;
  }[];
};

async function createStandingAssignment(params: {
  studentId: string;
  classIdSnapshot: string | null;
  classNameSnapshot: string | null;
  template: TemplateForCopy;
  standingSource: "class" | "individual";
  todayDate: Date;
}) {
  await prisma.checklistAssignment.create({
    data: {
      studentId: params.studentId,
      checklistDate: params.todayDate,
      classIdSnapshot: params.classIdSnapshot,
      classNameSnapshot: params.classNameSnapshot,
      sourceTemplateId: params.template.templateId,
      standingSource: params.standingSource,
      createdByAdminId: null, // 시스템 자동 생성
      items: {
        create: params.template.items.map((item) => ({
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
}

/**
 * 학생 1명의 "반 기본 템플릿" 오늘자 배정이 없으면 생성한다 (standingSource: "class").
 * 반환값: 실제로 새로 생성했으면 true.
 */
async function ensureClassOriginAssignment(studentId: string): Promise<boolean> {
  const todayStr = getAcademyToday();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  const student = await prisma.student.findUnique({
    where: { studentId },
    include: { currentClass: true },
  });
  if (!student || student.studentStatus === "withdrawn") return false;
  if (!student.currentClass?.templateId) return false;

  const existing = await prisma.checklistAssignment.findFirst({
    where: { studentId, checklistDate: todayDate, standingSource: "class" },
    select: { assignmentId: true },
  });
  if (existing) return false;

  const template = await prisma.checklistTemplate.findUnique({
    where: { templateId: student.currentClass.templateId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return false;

  await createStandingAssignment({
    studentId: student.studentId,
    classIdSnapshot: student.currentClassId,
    classNameSnapshot: student.currentClass?.name ?? null,
    template,
    standingSource: "class",
    todayDate,
  });
  return true;
}

/**
 * 학생 1명의 "개별 고정 배정" 오늘자 배정이 없으면 생성한다 (standingSource: "individual").
 * 반 기본 배정과 독립적으로 존재한다 — 반 체크리스트를 대체하지 않고 "추가"된다.
 * 반환값: 실제로 새로 생성했으면 true.
 */
async function ensureIndividualOriginAssignment(studentId: string): Promise<boolean> {
  const todayStr = getAcademyToday();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  const student = await prisma.student.findUnique({
    where: { studentId },
    include: { currentClass: true },
  });
  if (!student || student.studentStatus === "withdrawn") return false;
  if (!student.standingTemplateId) return false;

  const existing = await prisma.checklistAssignment.findFirst({
    where: { studentId, checklistDate: todayDate, standingSource: "individual" },
    select: { assignmentId: true },
  });
  if (existing) return false;

  const template = await prisma.checklistTemplate.findUnique({
    where: { templateId: student.standingTemplateId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return false;

  await createStandingAssignment({
    studentId: student.studentId,
    classIdSnapshot: student.currentClassId,
    classNameSnapshot: student.currentClass?.name ?? null,
    template,
    standingSource: "individual",
    todayDate,
  });
  return true;
}

/**
 * 학생의 "오늘" 체크리스트를 고정 배정 기준으로 자동 생성한다.
 *
 *   - 반 기본 템플릿(class)과 개별 고정 배정(individual)은 서로 덮어쓰지 않고
 *     같은 날 함께 존재할 수 있다 — 개별 배정은 반 체크리스트에 "추가"되는 개념
 *     (예: 특정 학생에게만 보충 과제를 더 준다).
 *   - 이미 오늘 생성된 배정(반/개별 각각)은 다시 건드리지 않는다 — 진행 중인
 *     체크/횟수/점수/제출 기록을 절대 건드리지 않는다.
 *   - 즉 "관리자가 바꾸지 않는 이상 매일 똑같은 체크리스트가 자동 생성"된다.
 */
export async function ensureTodayAssignment(studentId: string): Promise<void> {
  await ensureClassOriginAssignment(studentId);
  await ensureIndividualOriginAssignment(studentId);
}

/**
 * 반 전체(퇴원 제외) 학생에게 "반 기본 템플릿" 오늘자 배정을 생성한다 (없는 학생만).
 * 개별 고정 배정이 있는 학생도 포함된다 — 반 배정과 개별 배정은 서로 독립적이므로
 * 개별 배정 여부와 상관없이 반 배정도 정상적으로 받는다.
 * 반환값: 실제로 오늘자 반 배정이 새로 생성된 학생 수.
 */
export async function ensureTodayAssignmentsForClass(classId: string): Promise<number> {
  const students = await prisma.student.findMany({
    where: { currentClassId: classId, studentStatus: { not: "withdrawn" } },
    select: { studentId: true },
  });

  let createdCount = 0;
  for (const s of students) {
    const created = await ensureClassOriginAssignment(s.studentId);
    if (created) createdCount += 1;
  }
  return createdCount;
}
