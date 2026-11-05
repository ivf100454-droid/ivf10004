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
 * POST { templateId, templateItemIds: string[] } (위에서부터 순서대로, 남길 활동만)
 *   → 묶음의 순서를 저장하고(내일부터 자동 생성분에 반영),
 *     오늘 이미 만들어진 체크리스트의 항목 순서도 같이 바꾼다(체크·제출 기록은 그대로).
 *   → 목록에서 빠진 활동은 묶음과 오늘 체크리스트에서 제거한다(그 활동의 오늘 기록도 삭제).
 *     응답의 removed(제거된 활동의 원본 데이터)를 restore로 다시 보내면 되돌릴 수 있다.
 *
 * POST { templateId, templateItemIds, restore: removed[] }
 *   → 제거했던 활동을 묶음에 다시 넣고, 오늘 체크리스트에도 새 항목(빈 기록)으로 다시 만든다.
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

type TItem = { templateItemId: string; activityId: string | null; title: string };
type AItem = { assignedItemId: string; activityId: string | null; title: string };

// 되돌리기에 필요한 템플릿 항목 데이터 (DB에서 그대로 복사)
const SNAP_FIELDS = [
  "templateItemId", "activityId", "title", "isProgressItem", "hasCheck", "hasCount", "targetCount",
  "hasScore", "maxScore", "linkUrl", "linkLabel", "teachingVideoId", "hasPhotoSubmission",
  "hasAudioSubmission", "hasVideoSubmission", "hasFileSubmission", "hasQrScan", "requiredFeatures",
] as const;

function keyOf(it: { activityId: string | null; title: string }) {
  return it.activityId ? "a:" + it.activityId : "t:" + it.title;
}

function pick(src: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of SNAP_FIELDS) out[f] = src?.[f] ?? null;
  for (const f of ["isProgressItem", "hasCheck", "hasCount", "hasScore", "hasPhotoSubmission", "hasAudioSubmission", "hasVideoSubmission", "hasFileSubmission", "hasQrScan"]) {
    out[f] = !!out[f];
  }
  if (out.requiredFeatures === null) out.requiredFeatures = [];
  return out;
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const templateId: string = typeof body?.templateId === "string" ? body.templateId : "";
  const ids: string[] = Array.isArray(body?.templateItemIds)
    ? body.templateItemIds.filter((x: unknown): x is string => typeof x === "string")
    : [];
  const restore: Record<string, any>[] = Array.isArray(body?.restore) ? body.restore.map(pick) : [];
  if (!templateId || ids.length === 0) {
    return NextResponse.json({ error: "활동을 하나 이상 남겨주세요. 전부 없애려면 배정 해제를 사용하세요." }, { status: 400 });
  }
  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "활동 목록이 올바르지 않아요." }, { status: 400 });
  }

  const todayDate = new Date(`${getAcademyToday()}T00:00:00.000Z`);

  // ── 되돌리기: 제거했던 활동을 묶음에 다시 만든다 ──
  let restoredToday = 0;
  if (restore.length > 0) {
    const existing: TItem[] = await prisma.templateItem.findMany({
      where: { templateId },
      select: { templateItemId: true, activityId: true, title: true },
    });
    const existingKeys = new Set(existing.map(keyOf));
    const toCreate = restore.filter((r) => r.templateItemId && !existingKeys.has(keyOf(r as TItem)));
    for (const r of toCreate) {
      await prisma.templateItem.create({ data: { ...(r as any), templateId, sortOrder: 0 } });
    }

    // 오늘 체크리스트에도 다시 넣는다 (기록은 새로 시작)
    const assignments = await prisma.checklistAssignment.findMany({
      where: { sourceTemplateId: templateId, checklistDate: todayDate },
      select: {
        assignmentId: true,
        studentId: true,
        standingSource: true,
        items: { select: { activityId: true, title: true } },
      },
    });
    for (const a of assignments) {
      const have = new Set(a.items.map((x: { activityId: string | null; title: string }) => keyOf(x)));
      // 개별 배정은 같은 날 반 체크리스트에 이미 있는 활동은 만들지 않는다 (자동 생성 규칙과 동일)
      let classKeys = new Set<string>();
      if (a.standingSource === "individual") {
        const classItems: { activityId: string | null; title: string }[] = await prisma.assignedChecklistItem.findMany({
          where: { assignment: { studentId: a.studentId, checklistDate: todayDate, standingSource: "class" } },
          select: { activityId: true, title: true },
        });
        classKeys = new Set(classItems.map(keyOf));
      }
      for (const r of toCreate) {
        const k = keyOf(r as TItem);
        if (have.has(k) || classKeys.has(k)) continue;
        const { templateItemId, ...fields } = r;
        void templateItemId;
        await prisma.assignedChecklistItem.create({ data: { ...(fields as any), assignmentId: a.assignmentId, sortOrder: 0 } });
        restoredToday++;
      }
    }
  }

  const fullItems: any[] = await prisma.templateItem.findMany({ where: { templateId } });
  const items: TItem[] = fullItems.map((i) => ({ templateItemId: i.templateItemId, activityId: i.activityId, title: i.title }));
  const known = new Set<string>(items.map((i) => i.templateItemId));
  if (!ids.every((id) => known.has(id))) {
    return NextResponse.json({ error: "활동 목록이 바뀌었어요. 화면을 새로고침한 뒤 다시 해주세요." }, { status: 409 });
  }

  const byId = new Map<string, TItem>(items.map((i) => [i.templateItemId, i] as [string, TItem]));
  const rank = new Map<string, number>();
  ids.forEach((id, i) => rank.set(keyOf(byId.get(id)!), i));

  const removedRows = fullItems.filter((i) => !ids.includes(i.templateItemId));
  const removedKeys = new Set(removedRows.map((i) => keyOf(i)));

  const todayItems: AItem[] = await prisma.assignedChecklistItem.findMany({
    where: { assignment: { sourceTemplateId: templateId, checklistDate: todayDate } },
    select: { assignedItemId: true, activityId: true, title: true },
  });
  const deleteToday = todayItems.filter((it) => removedKeys.has(keyOf(it)));

  const ops: any[] = [
    ...ids.map((id, i) => prisma.templateItem.update({ where: { templateItemId: id }, data: { sortOrder: i } })),
    ...todayItems
      .filter((it) => rank.has(keyOf(it)))
      .map((it) =>
        prisma.assignedChecklistItem.update({ where: { assignedItemId: it.assignedItemId }, data: { sortOrder: rank.get(keyOf(it))! } })
      ),
  ];
  if (deleteToday.length > 0) {
    ops.push(prisma.assignedChecklistItem.deleteMany({ where: { assignedItemId: { in: deleteToday.map((x) => x.assignedItemId) } } }));
  }
  if (removedRows.length > 0) {
    ops.push(prisma.templateItem.deleteMany({ where: { templateItemId: { in: removedRows.map((x) => x.templateItemId) } } }));
  }
  await prisma.$transaction(ops);

  return NextResponse.json({
    ok: true,
    removed: removedRows.map(pick),
    removedToday: deleteToday.length,
    restoredToday,
  });
}
