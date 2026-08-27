import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { ensureTodayAssignmentsForClass } from "@/lib/checklistGeneration";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const existing = await prisma.class.findUnique({ where: { classId: params.id } });
  if (!existing) return NextResponse.json({ error: "존재하지 않는 클래스입니다." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: { name?: string; templateId?: string | null } = {};

  if (typeof body?.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, "templateId")) {
    const templateId = body.templateId;
    if (templateId) {
      const tpl = await prisma.checklistTemplate.findUnique({ where: { templateId } });
      if (!tpl) return NextResponse.json({ error: "존재하지 않는 템플릿입니다." }, { status: 400 });
      data.templateId = templateId;
    } else {
      data.templateId = null;
    }
  }

  const updated = await prisma.class.update({
    where: { classId: params.id },
    data: data,
    include: { template: true },
  });

  // 반 기본 템플릿을 새로 연결한 경우, 개별 배정이 없고 아직 오늘자가 없는 학생들에게
  // 즉시 오늘자 체크리스트를 생성한다 (진행 중인 학생은 건드리지 않음).
  if (Object.prototype.hasOwnProperty.call(data, "templateId") && data.templateId) {
    await ensureTodayAssignmentsForClass(updated.classId);
  }

  return NextResponse.json({
    classId: updated.classId,
    name: updated.name,
    templateId: updated.templateId,
    templateName: updated.template ? updated.template.name : null,
  });
}

/**
 * 클래스 삭제. 소속 학생이 있으면 기본적으로 거부하고 학생 수를 반환한다.
 * 클라이언트가 강한 확인 UI를 거쳐 ?force=true로 다시 요청해야 실제 삭제된다.
 *
 * DB 스키마에서 students.currentClassId → classes는 onDelete: SetNull 이므로,
 * 확인 절차를 우회해서 삭제 요청이 들어와도 학생 레코드 자체는 절대 깨지지 않는다.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const force = req.nextUrl.searchParams.get("force") === "true";

  const studentCount = await prisma.student.count({
    where: { currentClassId: params.id },
  });

  if (studentCount > 0 && !force) {
    return NextResponse.json(
      {
        error: "confirmation_required",
        message: `이 클래스에 소속된 학생이 ${studentCount}명 있습니다. 정말 삭제하시겠습니까?`,
        studentCount,
      },
      { status: 409 }
    );
  }

  await prisma.class.delete({ where: { classId: params.id } });
  return NextResponse.json({ ok: true });
}
