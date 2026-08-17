import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday } from "@/lib/timezone";

/**
 * ?year=2026&month=8 (1~12) 형식으로 받아 해당 월에 "확인 완료"(reviewedAt not null)로
 * 표시된 날짜들의 일(day) 숫자 목록을 반환한다. 화면은 이 배열에 있는 날짜만 파란점으로 표시한다.
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
  const endDate = new Date(year, month, 1); // 다음달 1일 (로컬 계산이지만 UTC 자정 비교라 day 경계로 충분)

  const assignments = await prisma.checklistAssignment.findMany({
    where: {
      studentId: params.id,
      reviewedAt: { not: null },
      checklistDate: { gte: startDate, lt: endDate },
    },
    select: { checklistDate: true },
  });

  const days = Array.from(
    new Set(
      assignments.map(function (a) {
        return a.checklistDate.getUTCDate();
      })
    )
  ).sort(function (a, b) {
    return a - b;
  });

  return NextResponse.json({ year: year, month: month, reviewedDays: days });
}
