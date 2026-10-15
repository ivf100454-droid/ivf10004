import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

// 활동 영역(범주) 목록 — 드래그 순서대로, 각 영역에 들어있는 활동 개수 포함
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const areas = await prisma.activityArea.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { activities: true } } },
  });
  return NextResponse.json(
    areas.map((a) => ({ areaId: a.areaId, name: a.name, activityCount: a._count.activities }))
  );
}

// 새 활동 영역 만들기. body: { name } — 목록 맨 아래에 추가된다.
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "활동 영역 이름을 입력하세요." }, { status: 400 });

  const dup = await prisma.activityArea.findFirst({ where: { name } });
  if (dup) return NextResponse.json({ error: "같은 이름의 활동 영역이 이미 있어요." }, { status: 409 });

  const bottom = await prisma.activityArea.aggregate({ _max: { sortOrder: true } });
  const area = await prisma.activityArea.create({
    data: { name, sortOrder: (bottom._max.sortOrder ?? -1) + 1 },
  });
  return NextResponse.json({ areaId: area.areaId, name: area.name, activityCount: 0 }, { status: 201 });
}
