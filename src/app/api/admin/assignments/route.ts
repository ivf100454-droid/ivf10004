import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday } from "@/lib/timezone";

/**
 * 템플릿을 학생에게 배정한다 (기능 플래그 구조로 값 복사).
 * 이전 배치와 동일한 단순화: 클릭할 때마다 새 checklist_assignment를 만든다
 * (27번 중복배정 유지/추가/교체 선택 UI는 다음 배치로 미룸).
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

  const assignment = await prisma.checklistAssignment.create({
    data: {
      studentId: student.studentId,
      checklistDate: new Date(`${todayStr}T00:00:00.000Z`),
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
