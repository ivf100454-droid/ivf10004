import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const classes = await prisma.class.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { students: true } } },
  });
  return NextResponse.json(classes);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "클래스 이름을 입력해주세요." }, { status: 400 });
  }
  const created = await prisma.class.create({ data: { name: body.name } });
  return NextResponse.json(created, { status: 201 });
}
