import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday } from "@/lib/timezone";

/**
 * ?year=2026&month=8 (1~12) 형식으로 받아 해당 월의 날짜별 진행률(%)을 자동 계산해서 반환한다.
 * 관리자가 수동으로 "확인 완료"를 누르지 않아도, 학생이 그날 체크리스트를 조금이라도 진행하면
 * 그 값 그대로 보여준다 — 관리자는 캘린더를 보기만 하면 된다.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const today = getAcademyToday();
  const [todayYear, todayMonth] = today.split("-").map(Number);

  const year = Number(req.nextUrl.searchParams.get("year")) || todayYear;
  const month = Number(req.nextUrl.searchParams.get("month")) || todayMonth;

  const monthStr = String(month).padStart(2, "0");
  const startDate = new Date(`${year}-${monthStr}-01T00:00:00.000Z`);
  const endDate = new Date(year, month, 1); // 다음달 1일 (day 경계 비교용)

  const assignments = await prisma.checklistAssignment.findMany({
    where: {
      studentId: params.id,
      checklistDate: { gte: startDate, lt: endDate },
    },
    include: { items: true },
  });

  const byDay: Record<number, { completed: number; total: number }> = {};
  for (const a of assignments) {
    const day = a.checklistDate.getUTCDate();
    if (!byDay[day]) byDay[day] = { completed: 0, total: 0 };
    for (const item of a.items) {
      if (!item.isProgressItem) continue;
      byDay[day].total += 1;
      if (item.completed) byDay[day].completed += 1;
    }
  }

  const days = Object.keys(byDay)
    .map(Number)
    .sort(function (a, b) {
      return a - b;
    })
    .map(function (day) {
      const { completed, total } = byDay[day];
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { day: day, progress: progress };
    });

  return NextResponse.json({ year: year, month: month, days: days });
}
