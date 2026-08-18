import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday } from "@/lib/timezone";

/**
 * 템플릿을 학생에게 배정한다 (기능 플래그 구조로 값 복사).
 * 같은 학생·같은 날짜에 이미 배정이 있으면 새로 배정하기 전에 기존 배정을
 * 전부 삭제한다 (배정을 여러 번 눌러도 중복 항목이 쌓이지 않도록).
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.studentId || !body?.templateId) {
    return NextResponse.json({ error: "studentId와 templateId가 필요합니다." }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { studentId: body.studentId },
    include: { currentClass: true },
  });
  if (!student) return NextResponse.json({ error: "존재하지 않는 학생입니다." }, { status: 404 });

  const template = await prisma.checklistTemplate.findUnique({
    where: { templateId: body.templateId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return NextResponse.json({ error: "존재하지 않는 템플릿입니다." }, { status: 404 });

  const todayStr = getAcademyToday();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  // 같은 학생·같은 날짜의 기존 배정이 있으면 새로 만들기 전에 전부 삭제한다.
  await prisma.checklistAssignment.deleteMany({
    where: { studentId: student.studentId, checklistDate: todayDate },
  });

  const assignment = await prisma.checklistAssignment.create({
    data: {
      studentId: student.studentId,
      checklistDate: todayDate,
      classIdSnapshot: student.currentClassId,
      classNameSnapshot: student.currentClass?.name ?? null,
      sourceTemplateId: template.templateId,
      createdByAdminId: admin.adminId,
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
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(assignment, { status: 201 });
}
