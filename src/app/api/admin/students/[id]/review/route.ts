import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday } from "@/lib/timezone";

/**
 * 학생 상세 화면의 "확인 완료" 버튼용. 해당 날짜(기본 오늘)의 그 학생 배정을
 * 전부 reviewedAt으로 표시한다 — 하루에 배정이 여러 개일 수 있어 assignmentId
 * 단위가 아니라 student+date 단위로 처리한다. 캘린더는 이 값이 있는 날을 파란색으로 표시한다.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const student = await prisma.student.findUnique({ where: { studentId: params.id } });
  if (!student) return NextResponse.json({ error: "존재하지 않는 학생입니다." }, { status: 404 });

  const body = await req.json().catch(function () {
    return {};
  });
  const dateStr: string = typeof body.date === "string" ? body.date : getAcademyToday();

  const result = await prisma.checklistAssignment.updateMany({
    where: {
      studentId: params.id,
      checklistDate: new Date(dateStr + "T00:00:00.000Z"),
    },
    data: {
      reviewedAt: new Date(),
      reviewedByAdminId: admin.adminId,
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "해당 날짜에 배정된 체크리스트가 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, count: result.count });
}
