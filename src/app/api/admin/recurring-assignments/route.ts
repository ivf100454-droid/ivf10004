import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

/**
 * 학생 또는 클래스의 "현재" 반복배정 상태를 조회한다 (활성/일시정지 상태 모두 포함,
 * 종료된 것은 최신순으로 1건만 참고용으로 함께 준다).
 * 쿼리: ?studentId=... 또는 ?classId=...
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const studentId = req.nextUrl.searchParams.get("studentId");
  const classId = req.nextUrl.searchParams.get("classId");
  if (!studentId && !classId) {
    return NextResponse.json({ error: "studentId 또는 classId가 필요합니다." }, { status: 400 });
  }

  const rows = await prisma.recurringAssignment.findMany({
    where: studentId
      ? { targetType: "student", studentId, status: { in: ["active", "paused"] } }
      : { targetType: "class", classId: classId!, status: { in: ["active", "paused"] } },
    include: { template: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    rows.map((r) => ({
      recurringAssignmentId: r.recurringAssignmentId,
      templateId: r.templateId,
      templateName: r.template.name,
      status: r.status,
      startDate: r.startDate,
      endDate: r.endDate,
      activeDays: r.activeDays,
      sequenceCounter: r.sequenceCounter,
    }))
  );
}
