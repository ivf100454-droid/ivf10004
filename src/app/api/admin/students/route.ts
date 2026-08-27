import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { registerStudent } from "@/lib/students";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const classId = req.nextUrl.searchParams.get("classId");
  const students = await prisma.student.findMany({
    where: classId ? { currentClassId: classId } : undefined,
    include: {
      account: { select: { loginId: true, accountStatus: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  // 개별 반복배정(활성/일시정지)이 있는 학생만 표시용 템플릿 이름을 붙여준다.
  const activeIndividual = await prisma.recurringAssignment.findMany({
    where: { targetType: "student", studentId: { in: students.map((s) => s.studentId) }, status: { in: ["active", "paused"] } },
    include: { template: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const standingByStudent = new Map<string, { name: string }>();
  for (const ra of activeIndividual) {
    if (ra.studentId && !standingByStudent.has(ra.studentId)) {
      standingByStudent.set(ra.studentId, { name: ra.template.name });
    }
  }

  return NextResponse.json(
    students.map((s) => ({ ...s, standingTemplate: standingByStudent.get(s.studentId) ?? null }))
  );
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.loginId || !body?.initialPassword) {
    return NextResponse.json(
      { error: "이름, 아이디, 초기 비밀번호를 모두 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const { student, account } = await registerStudent({
      name: body.name,
      loginId: body.loginId,
      initialPassword: body.initialPassword,
      classId: body.classId ?? null,
    });
    return NextResponse.json(
      { studentId: student.studentId, loginId: account.loginId },
      { status: 201 }
    );
  } catch (err) {
    // partial unique index(활성 login_id 유일성) 위반 시 Prisma가 P2002를 던진다.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다." },
        { status: 409 }
      );
    }
    throw err;
  }
}
