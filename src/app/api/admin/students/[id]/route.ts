import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { changeStudentClass } from "@/lib/students";

/**
 * 학생의 현재 클래스를 변경(배정/이동/제거)한다.
 * 3번 요구사항: 과거 assignment의 class_id_snapshot은 이 변경과 무관하게 그대로 보존된다
 * (여기서는 students.currentClassId만 바꾸고, 과거 기록 테이블은 건드리지 않음).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  // classId가 아예 없는 요청과, classId: null(클래스 없음으로 변경)을 구분한다.
  if (!body || !("classId" in body)) {
    return NextResponse.json({ error: "classId가 필요합니다 (없음은 null)." }, { status: 400 });
  }

  if (body.classId) {
    const targetClass = await prisma.class.findUnique({ where: { classId: body.classId } });
    if (!targetClass) {
      return NextResponse.json({ error: "존재하지 않는 클래스입니다." }, { status: 404 });
    }
  }

  const updated = await changeStudentClass(params.id, body.classId ?? null);
  return NextResponse.json({ ok: true, studentId: updated.studentId, currentClassId: updated.currentClassId });
}
