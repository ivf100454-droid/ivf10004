import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday, getWeekday } from "@/lib/timezone";

/**
 * 프린트용: 오늘(학원 기준) 반 기본 배정이 있는 수업들과 각 수업의 활동 목록을 돌려준다.
 * - 클래스별 배정(반 기본, targetType "class")만 포함한다. 학생 개별 배정은 넣지 않는다.
 * - 진행 중(active)이고, 시작일~종료일 안이며, 오늘 요일이 적용 요일에 들어 있는 배정만.
 * - 수업 순서는 수업 화면의 드래그 순서(sortOrder)를 따른다.
 * - 읽기 전용: 아무것도 생성·수정하지 않는다.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const todayStr = getAcademyToday();
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
  const weekday = getWeekday(todayStr);

  const classes = await prisma.class.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      recurringAssignments: {
        where: {
          targetType: "class",
          status: "active",
          startDate: { lte: todayDate },
          OR: [{ endDate: null }, { endDate: { gte: todayDate } }],
        },
        orderBy: { createdAt: "asc" },
        include: {
          template: {
            include: { items: { orderBy: { sortOrder: "asc" }, select: { title: true, activityId: true } } },
          },
        },
      },
    },
  });

  const result = classes
    .map((c) => {
      const seen = new Set<string>();
      const activities: string[] = [];
      for (const ra of c.recurringAssignments) {
        if (!ra.activeDays.includes(weekday)) continue;
        for (const item of ra.template.items) {
          const key = item.activityId ?? `t:${item.title}`;
          if (seen.has(key)) continue;
          seen.add(key);
          activities.push(item.title);
        }
      }
      return { classId: c.classId, name: c.name, activities };
    })
    .filter((c) => c.activities.length > 0);

  return NextResponse.json({ date: todayStr, weekday, classes: result });
}
