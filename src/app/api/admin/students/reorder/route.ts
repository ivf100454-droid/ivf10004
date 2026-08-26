import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const studentIds: string[] = Array.isArray(body?.studentIds) ? body.studentIds : [];
  if (studentIds.length === 0) {
    return NextResponse.json({ error: "순서를 재정렬할 학생 목록이 필요합니다." }, { status: 400 });
  }

  await prisma.$transaction(
    studentIds.map((studentId, i) =>
      prisma.student.update({ where: { studentId }, data: { sortOrder: i } })
    )
  );

  return NextResponse.json({ ok: true });
}
