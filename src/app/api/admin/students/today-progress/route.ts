import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday } from "@/lib/timezone";

/**
 * 모든 활성 학생의 "오늘" 체크리스트 진행률을 { studentId: progress(0~100) } 형태로
 * 한 번에 반환한다. 학생별로 today API를 하나씩 부르지 않고, 완료현황 목록 화면에서
 * 이름 옆에 즉시 퍼센트를 보여주기 위한 용도다. 오늘 배정이 아예 없는 학생은 0으로 취급.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const todayStr = getAcademyToday();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  const assignments = await prisma.checklistAssignment.findMany({
    where: { checklistDate: todayDate },
    select: {
      studentId: true,
      items: { where: { isProgressItem: true }, select: { completed: true } },
    },
  });

  const byStudent = new Map<string, { total: number; completed: number }>();
  for (const a of assignments) {
    const bucket = byStudent.get(a.studentId) ?? { total: 0, completed: 0 };
    bucket.total += a.items.length;
    bucket.completed += a.items.filter((i) => i.completed).length;
    byStudent.set(a.studentId, bucket);
  }

  const result: Record<string, number> = {};
  for (const [studentId, b] of byStudent) {
    result[studentId] = b.total === 0 ? 0 : Math.round((b.completed / b.total) * 100);
  }

  return NextResponse.json(result);
}
