import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday } from "@/lib/timezone";

/**
 * 체크리스트 활동 순서 수정.
 *
 * GET ?studentId=... (학생의 "개별 추가" 배정) 또는 ?classId=... (반 기본 배정)
 *   → 현재 배정 묶음(템플릿)의 활동 목록을 순서대로 돌려준다.
 *
 * POST { templateId, templateItemIds: string[] } (위에서부터 순서대로)
 *   → 묶음의 순서를 저장하고(내일부터 자동 생성분에 반영),
 *     오늘 이미 만들어진 체크리스트의 항목 순서도 같이 바꾼다(체크·제출 기록은 그대로).
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const studentId = req.nextUrl.searchParams.get("studentId");
  const classId = req.nextUrl.searchParams.get("classId");
  if (!studentId && !classId) {
    return NextResponse.json({ error: "studentId 또는 classId가 필요합니다." }, { status: 400 });
  }

  const ra = await prisma.recurringAssignment.findFirst({
    where: studentId
      ? { targetType: "student", studentId, status: { in: ["active", "paused"] } }
      : { targetType: "class", classId: classId!, status: { in: ["active", "paused"] } },
    orderBy: { createdAt: "desc" },
    include: {
      template: {
        include: { items: { orderBy: { sortOrder: "asc" }, select: { templateItemId: true, title: true } } },
      },
    },
  });

  if (!ra) return NextResponse.json({ templateId: null, items: [] });
  return NextResponse.json({ templateId: ra.templateId, items: ra.template.items });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const templateId: string = typeof body?.templateId === "string" ? body.templateId : "";
  const ids: string[] = Array.isArray(body?.templateItemIds)
    ? body.templateItemIds.filter((x: unknown): x is string => typeof x === "string")
    : [];
  if (!templateId || ids.length === 0) {
    return NextResponse.json({ error: "순서를 바꿀 활동 목록이 필요합니다." }, { status: 400 });
  }

  type TItem = { templateItemId: string; activityId: string | null; title: string };
  const items: TItem[] = await prisma.templateItem.findMany({
    where: { templateId },
    select: { templateItemId: true, activityId: true, title: true },
  });
  const known = new Set<string>(items.map((i: TItem) => i.templateItemId));
  if (ids.length !== items.length || !ids.every((id) => known.has(id)) || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "활동 목록이 바뀌었어요. 화면을 새로고침한 뒤 다시 해주세요." }, { status: 409 });
  }

  // 새 순서: 활동ID(없으면 제목) → 위치
  const byId = new Map<string, TItem>(items.map((i: TItem) => [i.templateItemId, i] as [string, TItem]));
  const rank = new Map<string, number>();
  ids.forEach((id, i) => {
    const it = byId.get(id)!;
    rank.set(it.activityId ? "a:" + it.activityId : "t:" + it.title, i);
  });

  const todayDate = new Date(`${getAcademyToday()}T00:00:00.000Z`);
  type AItem = { assignedItemId: string; activityId: string | null; title: string };
  const todayItems: AItem[] = await prisma.assignedChecklistItem.findMany({
    where: { assignment: { sourceTemplateId: templateId, checklistDate: todayDate } },
    select: { assignedItemId: true, activityId: true, title: true },
  });

  await prisma.$transaction([
    ...ids.map((id, i) => prisma.templateItem.update({ where: { templateItemId: id }, data: { sortOrder: i } })),
    ...todayItems
      .map((it: AItem) => {
        const r = rank.get(it.activityId ? "a:" + it.activityId : "t:" + it.title);
        return r === undefined
          ? null
          : prisma.assignedChecklistItem.update({ where: { assignedItemId: it.assignedItemId }, data: { sortOrder: r } });
      })
      .filter((x: unknown) => x !== null) as any[],
  ]);

  return NextResponse.json({ ok: true, todayUpdated: todayItems.length });
}
