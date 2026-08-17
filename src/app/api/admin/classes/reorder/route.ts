import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const classIds: string[] = Array.isArray(body?.classIds) ? body.classIds : [];
  if (classIds.length === 0) {
    return NextResponse.json({ error: "순서를 재정렬할 클래스 목록이 필요합니다." }, { status: 400 });
  }

  await prisma.$transaction(
    classIds.map((classId, i) =>
      prisma.class.update({ where: { classId: classId }, data: { sortOrder: i } })
    )
  );

  return NextResponse.json({ ok: true });
}
