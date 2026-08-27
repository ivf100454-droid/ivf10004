import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday } from "@/lib/timezone";
import { getActiveRecurring, startOrReplaceRecurring, endRecurring } from "@/lib/recurringAssignments";
import { ensureTodayAssignment } from "@/lib/checklistGeneration";

/**
 * 학생 1명에게 템플릿을 "개별 반복배정(추가)"으로 시작한다.
 *
 * - RecurringAssignment(targetType: "student")를 새로 시작하거나(기존과 다른 템플릿이면
 *   기존 것을 종료하고 새로 시작), 같은 템플릿이면 그대로 둔다.
 * - 반(Class) 기본 반복배정은 절대 건드리지 않는다 — 개별 배정은 반 체크리스트를
 *   대체하는 게 아니라 "그 학생에게만 추가로" 얹히는 별도의 체크리스트다.
 * - templateId가 빈 문자열("")로 오면 개별 반복배정을 종료한다 (반 체크리스트는 그대로 유지).
 * - 오늘 날짜의 "개별" 배정만 즉시 반영을 위해 지우고 새로 만든다. 오늘의 반 기본 배정은
 *   손대지 않는다.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.studentId || typeof body?.templateId !== "string") {
    return NextResponse.json({ error: "studentId와 templateId가 필요합니다." }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { studentId: body.studentId } });
  if (!student) return NextResponse.json({ error: "존재하지 않는 학생입니다." }, { status: 404 });

  const clearingOverride = body.templateId === "";
  const todayStr = getAcademyToday();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  if (clearingOverride) {
    const existing = await getActiveRecurring("student", student.studentId);
    if (existing) await endRecurring(existing.recurringAssignmentId);

    // 오늘의 "개별" 배정만 지운다 (반 기본 배정은 그대로 유지).
    await prisma.checklistAssignment.deleteMany({
      where: { studentId: student.studentId, checklistDate: todayDate, standingSource: "individual" },
    });

    return NextResponse.json({
      studentId: student.studentId,
      items: [],
      message: "개별 배정을 해제했습니다. (반 기본 체크리스트는 그대로 유지됩니다.)",
    });
  }

  const template = await prisma.checklistTemplate.findUnique({ where: { templateId: body.templateId } });
  if (!template) return NextResponse.json({ error: "존재하지 않는 템플릿입니다." }, { status: 404 });

  const { recurringAssignment, changed } = await startOrReplaceRecurring({
    targetType: "student",
    studentId: student.studentId,
    templateId: template.templateId,
    createdByAdminId: admin.adminId,
  });

  if (changed) {
    // 템플릿이 바뀐 경우, 오늘의 "개별" 배정만 지우고 새 템플릿으로 즉시 재생성한다.
    await prisma.checklistAssignment.deleteMany({
      where: { studentId: student.studentId, checklistDate: todayDate, standingSource: "individual" },
    });
  }

  await ensureTodayAssignment(student.studentId);

  const assignment = await prisma.checklistAssignment.findFirst({
    where: { studentId: student.studentId, recurringAssignmentId: recurringAssignment.recurringAssignmentId, checklistDate: todayDate },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(assignment ?? { studentId: student.studentId, items: [] }, { status: 201 });
}
