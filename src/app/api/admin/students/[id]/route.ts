import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { changeStudentClass } from "@/lib/students";

/**
 * 학생 정보 수정. name과 classId 둘 다(또는 하나만) 받을 수 있다.
 * classId는 "필드가 아예 없음"과 "null(클래스 없음으로 변경)"을 구분해야 하므로
 * "classId" in body로 존재 여부를 확인한다.
 * 3번 요구사항: 과거 assignment의 class_id_snapshot은 이 변경과 무관하게 그대로 보존된다.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });

  if (typeof body.name === "string" && body.name.trim()) {
    await prisma.student.update({
      where: { studentId: params.id },
      data: { name: body.name.trim() },
    });
  }

  if ("classId" in body) {
    if (body.classId) {
      const targetClass = await prisma.class.findUnique({ where: { classId: body.classId } });
      if (!targetClass) {
        return NextResponse.json({ error: "존재하지 않는 클래스입니다." }, { status: 404 });
      }
    }
    await changeStudentClass(params.id, body.classId ?? null);
  }

  const updated = await prisma.student.findUnique({
    where: { studentId: params.id },
    include: { account: { select: { loginId: true, accountStatus: true } } },
  });

  return NextResponse.json(updated);
}
