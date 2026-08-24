import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { getAcademyToday } from "@/lib/timezone";

/**
 * 로그인한 학생 본인의 최근 학습 기록(기본 14일)을 날짜별로 반환한다.
 * 주간 요약(완료 과제 수, 평균 점수)과 날짜별 완료 항목 목록을 함께 내려준다.
 */
export async function GET(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const days = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 14));
  const todayStr = getAcademyToday();
  const today = new Date(`${todayStr}T00:00:00.000Z`);
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - (days - 1));

  const assignments = await prisma.checklistAssignment.findMany({
    where: {
      studentId: student.studentId,
      checklistDate: { gte: from, lte: today },
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { checklistDate: "desc" },
  });

  type DateBucket = { date: string; items: typeof assignments[number]["items"] };
  const byDate = new Map<string, DateBucket>();
  for (const a of assignments) {
    const dateStr = a.checklistDate.toISOString().slice(0, 10);
    if (!byDate.has(dateStr)) byDate.set(dateStr, { date: dateStr, items: [] });
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

  // 최근 7일(오늘 포함) 요일별 완료 여부 스트립
  const weekStrip: { date: string; allDone: boolean; hasData: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const rec = dailyRecords.find((r) => r.date === dateStr);
    weekStrip.push({
      date: dateStr,
      hasData: !!rec && rec.totalCount > 0,
      allDone: !!rec && rec.totalCount > 0 && rec.completedCount >= rec.totalCount,
    });
  }

  const weekRecords = dailyRecords.filter((r) => weekStrip.some((w) => w.date === r.date));
  const weekCompleted = weekRecords.reduce((sum, r) => sum + r.completedCount, 0);
  const weekTotal = weekRecords.reduce((sum, r) => sum + r.totalCount, 0);
  const weekScored = weekRecords.filter((r) => r.avgScorePct !== null);
  const weekAvgScore =
    weekScored.length === 0
      ? null
      : Math.round(weekScored.reduce((sum, r) => sum + (r.avgScorePct || 0), 0) / weekScored.length);

  return NextResponse.json({
    studentName: student.name,
    weekStrip,
    weekSummary: { completedCount: weekCompleted, totalCount: weekTotal, avgScorePct: weekAvgScore },
    dailyRecords,
  });
}
