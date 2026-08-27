import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const assignment = await prisma.checklistAssignment.findUnique({
    where: { assignmentId: params.id },
  });
  if (!assignment) return NextResponse.json({ error: "존재하지 않는 배정입니다." }, { status: 404 });

  await prisma.checklistAssignment.delete({ where: { assignmentId: params.id } });

  return NextResponse.json({ ok: true });
}

/**
 * 과거 날짜 배정을 "재오픈"(수정 가능하게 다시 열기) 또는 "잠금"(원래대로 되돌리기)한다.
 * body: { reopened: boolean }
 * 재오픈된 동안에는 학생·관리자 모두 해당 날짜의 체크/점수/제출 파일을 다시 고칠 수 있다.
 * 오늘 날짜 배정은 원래도 항상 수정 가능하므로 이 토글과 무관하다.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const assignment = await prisma.checklistAssignment.findUnique({ where: { assignmentId: params.id } });
  if (!assignment) return NextResponse.json({ error: "존재하지 않는 배정입니다." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.reopened !== "boolean") {
    return NextResponse.json({ error: "reopened(boolean)이 필요합니다." }, { status: 400 });
  }

  const updated = await prisma.checklistAssignment.update({
    where: { assignmentId: params.id },
    data: { reopenedForEditing: body.reopened },
  });

  return NextResponse.json({ assignmentId: updated.assignmentId, reopenedForEditing: updated.reopenedForEditing });
}
