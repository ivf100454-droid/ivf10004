import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { getAcademyToday } from "@/lib/timezone";

/**
 * 로그인한 학생 본인의 "월 단위" 학습 기록을 반환한다.
 * ?year=2026&month=8 (1~12) 형식으로 받아 그 달 전체의 날짜별 진행률(캘린더용)과
 * 날짜별 완료 항목 상세(dailyRecords), 이번 달 요약을 함께 내려준다.
 */
export async function GET(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const todayStr = getAcademyToday();
  const [todayYear, todayMonth] = todayStr.split("-").map(Number);

  const year = Number(req.nextUrl.searchParams.get("year")) || todayYear;
  const month = Number(req.nextUrl.searchParams.get("month")) || todayMonth;

  const monthStr = String(month).padStart(2, "0");
  const startDate = new Date(`${year}-${monthStr}-01T00:00:00.000Z`);
  const endDate = new Date(Date.UTC(year, month, 1)); // 다음달 1일 (UTC 기준 day 경계)

  const assignments = await prisma.checklistAssignment.findMany({
    where: {
      studentId: student.studentId,
      checklistDate: { gte: startDate, lt: endDate },
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { checklistDate: "asc" },
  });

  type DateBucket = { date: string; day: number; items: typeof assignments[number]["items"] };
  const byDate = new Map<string, DateBucket>();
  for (const a of assignments) {
    const dateStr = a.checklistDate.toISOString().slice(0, 10);
    const day = a.checklistDate.getUTCDate();
    if (!byDate.has(dateStr)) byDate.set(dateStr, { date: dateStr, day, items: [] });
    byDate.get(dateStr)!.items.push(...a.items);
  }

  const dailyRecords = Array.from(byDate.values())
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((d) => {
      const progressItems = d.items.filter((i) => i.isProgressItem);
      const completedCount = progressItems.filter((i) => i.completed).length;
      const progress =
        progressItems.length === 0 ? 0 : Math.round((completedCount / progressItems.length) * 100);
      const scored = d.items.filter((i) => i.hasScore && i.score !== null && i.maxScore);
      const avgScorePct =
        scored.length === 0
          ? null
          : Math.round(
              (scored.reduce((sum, i) => sum + i.score! / i.maxScore!, 0) / scored.length) * 100
            );
      return {
        date: d.date,
        totalCount: d.items.length,
        completedCount,
        progress,
        avgScorePct,
        items: d.items.map((i) => ({
          assignedItemId: i.assignedItemId,
          title: i.title,
          completed: i.completed,
          hasScore: i.hasScore,
          score: i.score,
          maxScore: i.maxScore,
          hasCount: i.hasCount,
          currentCount: i.currentCount,
          targetCount: i.targetCount,
        })),
      };
    });

  // 캘린더용: 이 달에 배정이 있었던 날짜만 day/progress로 축약해서 내려준다.
  const days = Array.from(byDate.values())
    .map((d) => {
      const progressItems = d.items.filter((i) => i.isProgressItem);
      const completedCount = progressItems.filter((i) => i.completed).length;
      const progress =
        progressItems.length === 0 ? 0 : Math.round((completedCount / progressItems.length) * 100);
      return { day: d.day, progress };
    })
    .sort((a, b) => a.day - b.day);

  // 이번 달 요약(완료 과제 수, 평균 점수)
  const monthCompleted = dailyRecords.reduce((sum, r) => sum + r.completedCount, 0);
  const monthTotal = dailyRecords.reduce((sum, r) => sum + r.totalCount, 0);
  const monthScored = dailyRecords.filter((r) => r.avgScorePct !== null);
  const monthAvgScore =
    monthScored.length === 0
      ? null
      : Math.round(monthScored.reduce((sum, r) => sum + (r.avgScorePct || 0), 0) / monthScored.length);

  return NextResponse.json({
    studentName: student.name,
    year,
    month,
    days,
    monthSummary: { completedCount: monthCompleted, totalCount: monthTotal, avgScorePct: monthAvgScore },
    dailyRecords,
  });
}
