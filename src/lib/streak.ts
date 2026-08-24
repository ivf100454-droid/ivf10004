import { prisma } from "@/lib/db";
import { getAcademyToday } from "@/lib/timezone";

/**
 * 학생의 연속 학습 일수(스트릭)를 계산한다.
 * - 배정이 있었던 날 중, 진행률 항목이 전부 완료된 날만 "성공한 날"로 센다.
 * - 오늘은 아직 진행 중일 수 있으므로, 오늘이 미완료여도 스트릭을 끊지 않는다.
 * - 배정이 아예 없었던 날(휴일 등)은 건너뛰고 스트릭을 유지한다.
 * - 배정은 있었지만 완료하지 못한 과거 날짜를 만나면 그 지점에서 스트릭이 끊긴다.
 */
export async function computeStreak(studentId: string, lookbackDays = 90): Promise<number> {
  const todayStr = getAcademyToday();
  const today = new Date(`${todayStr}T00:00:00.000Z`);
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - lookbackDays);

  const assignments = await prisma.checklistAssignment.findMany({
    where: { studentId, checklistDate: { gte: from, lte: today } },
    include: { items: true },
  });

  const byDate = new Map<string, { total: number; done: number }>();
  for (const a of assignments) {
    const dateStr = a.checklistDate.toISOString().slice(0, 10);
    const bucket = byDate.get(dateStr) || { total: 0, done: 0 };
    for (const item of a.items) {
      if (!item.isProgressItem) continue;
      bucket.total += 1;
      if (item.completed) bucket.done += 1;
    }
    byDate.set(dateStr, bucket);
  }

  let streak = 0;
  const cursor = new Date(today);
  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const bucket = byDate.get(dateStr);
    const isToday = dateStr === todayStr;

    if (!bucket || bucket.total === 0) {
      // 그날 배정 자체가 없었다면 건너뛰고 계속 이전 날짜를 확인한다.
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      // 무한 루프 방지: lookbackDays를 넘어서면 종료
      if (cursor < from) break;
      continue;
    }

    const fullyDone = bucket.done >= bucket.total;
    if (fullyDone) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      continue;
    }

    if (isToday) {
      // 오늘은 미완료여도 스트릭을 끊지 않고, 그냥 오늘은 카운트하지 않는다.
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      continue;
    }

    // 과거의 미완료 날짜를 만나면 여기서 스트릭 종료.
    break;
  }

  return streak;
}
