import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

// 활동 영역 이름 수정. body: { name }
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const existing = await prisma.activityArea.findUnique({ where: { areaId: params.id } });
  if (!existing) return NextResponse.json({ error: "존재하지 않는 활동 영역입니다." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "활동 영역 이름을 입력하세요." }, { status: 400 });

  const dup = await prisma.activityArea.findFirst({ where: { name, NOT: { areaId: params.id } } });
  if (dup) return NextResponse.json({ error: "같은 이름의 활동 영역이 이미 있어요." }, { status: 409 });

  const area = await prisma.activityArea.update({ where: { areaId: params.id }, data: { name } });
  return NextResponse.json({ areaId: area.areaId, name: area.name });
}

// 활동 영역 삭제 — 안에 있던 활동은 지워지지 않고 "미분류"로 옮겨진다.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const existing = await prisma.activityArea.findUnique({ where: { areaId: params.id } });
  if (!existing) return NextResponse.json({ error: "존재하지 않는 활동 영역입니다." }, { status: 404 });

  await prisma.$transaction([
    prisma.activity.updateMany({ where: { areaId: params.id }, data: { areaId: null } }),
    prisma.activityArea.delete({ where: { areaId: params.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
