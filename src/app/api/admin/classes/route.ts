import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const classes = await prisma.class.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { students: true } }, template: true },
  });
  return NextResponse.json(
    classes.map((c) => ({
      classId: c.classId,
      name: c.name,
      sortOrder: c.sortOrder,
      studentCount: c._count.students,
      templateId: c.templateId,
      templateName: c.template ? c.template.name : null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "클래스 이름을 입력해주세요." }, { status: 400 });
  }

  const dup = await prisma.class.findFirst({ where: { name: name } });
  if (dup) {
    return NextResponse.json({ error: `"${name}" 수업이 이미 존재합니다.` }, { status: 409 });
  }

  const last = await prisma.class.findFirst({ orderBy: { sortOrder: "desc" } });
  const nextOrder = last ? last.sortOrder + 1 : 0;

  const created = await prisma.class.create({ data: { name: name, sortOrder: nextOrder } });
  return NextResponse.json(created, { status: 201 });
}
