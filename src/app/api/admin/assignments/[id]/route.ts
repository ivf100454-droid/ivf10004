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
