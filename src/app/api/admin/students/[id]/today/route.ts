import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday } from "@/lib/timezone";

/**
 * 특정 학생의 "오늘" 체크리스트 배정·항목·진행률을 반환한다.
 * 32번 요구사항: 진행률 = 완료된 is_progress_item 수 / 전체 is_progress_item 수 × 100
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const todayStr = getAcademyToday();

  const assignments = await prisma.checklistAssignment.findMany({
    where: {
      studentId: params.id,
      checklistDate: new Date(`${todayStr}T00:00:00.000Z`),
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  const allItems = assignments.flatMap((a) => a.items);
  const progressItems = allItems.filter((i) => i.isProgressItem);
  const completedCount = progressItems.filter((i) => i.completed).length;
  const progress =
    progressItems.length === 0 ? 0 : Math.round((completedCount / progressItems.length) * 100);

  return NextResponse.json({ date: todayStr, assignments, progress });
}
