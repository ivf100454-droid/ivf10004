import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday } from "@/lib/timezone";

/**
 * 학생 1명에게 템플릿을 "개별 고정 배정(추가)"한다.
 *
 * - student.standingTemplateId를 이 템플릿으로 저장한다 — 관리자가 다시 바꾸기 전까지
 *   매일 자동으로 같은 템플릿이 배정된다.
 * - 반(Class) 기본 체크리스트는 절대 건드리지 않는다 — 개별 배정은 반 체크리스트를
 *   대체하는 게 아니라 "그 학생에게만 추가로" 얹히는 별도의 체크리스트다.
 * - templateId가 빈 문자열("")로 오면 개별 고정 배정을 해제한다 (반 체크리스트는 그대로 유지).
 * - 오늘 날짜의 "개별" 배정만 즉시 반영을 위해 지우고 새로 만든다 (여러 번 눌러도
 *   중복 항목이 쌓이지 않도록). 오늘의 반 기본 배정은 손대지 않는다.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.studentId || typeof body?.templateId !== "string") {
    return NextResponse.json({ error: "studentId와 templateId가 필요합니다." }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { studentId: body.studentId },
    include: { currentClass: true },
  });
  if (!student) return NextResponse.json({ error: "존재하지 않는 학생입니다." }, { status: 404 });

  const clearingOverride = body.templateId === "";
  let template: any = null;

  if (!clearingOverride) {
    template = await prisma.checklistTemplate.findUnique({
      where: { templateId: body.templateId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!template) return NextResponse.json({ error: "존재하지 않는 템플릿입니다." }, { status: 404 });
  }

  // 학생의 개별 고정 배정을 갱신한다.
  await prisma.student.update({
    where: { studentId: student.studentId },
    data: { standingTemplateId: clearingOverride ? null : template.templateId },
  });

  const todayStr = getAcademyToday();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  // 오늘의 "개별" 배정만 지운다 (반 기본 배정은 그대로 유지).
  await prisma.checklistAssignment.deleteMany({
    where: { studentId: student.studentId, checklistDate: todayDate, standingSource: "individual" },
  });

  if (clearingOverride) {
    return NextResponse.json({
      studentId: student.studentId,
      standingTemplateId: null,
      items: [],
      message: "개별 배정을 해제했습니다. (반 기본 체크리스트는 그대로 유지됩니다.)",
    });
  }

  const assignment = await prisma.checklistAssignment.create({
    data: {
      studentId: student.studentId,
      checklistDate: todayDate,
      classIdSnapshot: student.currentClassId,
      classNameSnapshot: student.currentClass?.name ?? null,
      sourceTemplateId: template.templateId,
      standingSource: "individual",
      createdByAdminId: admin.adminId,
      items: {
        create: template.items.map((item: any) => ({
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
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(assignment, { status: 201 });
}
