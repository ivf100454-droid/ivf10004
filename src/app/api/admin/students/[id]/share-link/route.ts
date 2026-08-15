import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday } from "@/lib/timezone";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const student = await prisma.student.findUnique({ where: { studentId: params.id } });
  if (!student) return NextResponse.json({ error: "존재하지 않는 학생입니다." }, { status: 404 });

  const body = await req.json().catch(function () {
    return {};
  });
  const checklistDateStr: string =
    typeof body.checklistDate === "string" ? body.checklistDate : getAcademyToday();
  const expiresInDays: number =
    typeof body.expiresInDays === "number" ? body.expiresInDays : 30;

  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");

  const shareLink = await prisma.shareLink.create({
    data: {
      token: token,
      studentId: student.studentId,
      checklistDate: new Date(checklistDateStr + "T00:00:00.000Z"),
      createdByAdminId: admin.adminId,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json(
    {
      token: shareLink.token,
      checklistDate: checklistDateStr,
      expiresAt: shareLink.expiresAt,
    },
    { status: 201 }
  );
}
