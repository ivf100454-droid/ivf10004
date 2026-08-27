import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { ensureTodayAssignmentsForClass } from "@/lib/checklistGeneration";

/**
 * 클래스 전체에 템플릿을 "반 기본 고정 배정"한다.
 *
 * - class.templateId를 이 템플릿으로 저장한다. 이후 이 반의 활성 학생 전원에게 매일
 *   이 템플릿으로 자동 배정된다 — 학생이 개별 고정 배정(추가 배정)을 따로 갖고 있어도
 *   반 배정은 별개로 그대로 받는다 (반+개별 동시 존재, 서로 덮어쓰지 않음).
 * - 이미 오늘자 "반" 체크리스트를 받은 학생은 건드리지 않는다 (진행 중인 기록 보존) —
 *   아직 오늘자 반 배정이 없는 학생에게만 즉시 생성한다.
 * - templateId가 빈 문자열("")이면 반 기본 템플릿을 해제한다.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.classId || typeof body?.templateId !== "string") {
    return NextResponse.json({ error: "classId와 templateId가 필요합니다." }, { status: 400 });
  }

  const cls = await prisma.class.findUnique({ where: { classId: body.classId } });
  if (!cls) return NextResponse.json({ error: "존재하지 않는 클래스입니다." }, { status: 404 });

  const clearing = body.templateId === "";
  if (!clearing) {
    const template = await prisma.checklistTemplate.findUnique({ where: { templateId: body.templateId } });
    if (!template) return NextResponse.json({ error: "존재하지 않는 템플릿입니다." }, { status: 404 });
  }

  const updated = await prisma.class.update({
    where: { classId: cls.classId },
    data: { templateId: clearing ? null : body.templateId },
    include: { template: true, _count: { select: { students: true } } },
  });

  const createdCount = clearing ? 0 : await ensureTodayAssignmentsForClass(cls.classId);

  return NextResponse.json({
    classId: updated.classId,
    className: updated.name,
    templateId: updated.templateId,
    templateName: updated.template ? updated.template.name : null,
    studentCount: updated._count.students,
    todayGeneratedCount: createdCount,
  });
}
