import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

// 활동 만들기 목록의 드래그 순서를 저장한다. body: { activityIds: string[] } (위에서부터 순서대로)
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const activityIds: string[] = Array.isArray(body?.activityIds)
    ? body.activityIds.filter((x: unknown): x is string => typeof x === "string")
    : [];
  if (activityIds.length === 0) {
    return NextResponse.json({ error: "순서를 바꿀 활동 목록이 필요합니다." }, { status: 400 });
  }

  await prisma.$transaction(
    activityIds.map((activityId, i) =>
      prisma.activity.updateMany({ where: { activityId: activityId }, data: { sortOrder: i } })
    )
  );

  return NextResponse.json({ ok: true });
}
