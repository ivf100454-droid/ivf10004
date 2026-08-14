import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createAdminSession } from "@/lib/adminAuth";

const ADMIN_SESSION_COOKIE = "admin_session_token";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.loginId || !body?.password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해주세요." }, { status: 400 });
  }

  const admin = await prisma.administrator.findUnique({ where: { loginId: body.loginId } });

  const invalidResponse = () =>
    NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });

  if (!admin) return invalidResponse();

  const ok = await verifyPassword(body.password, admin.passwordHash);
  if (!ok) return invalidResponse();

  const { rawToken } = await createAdminSession(admin.adminId);

  const res = NextResponse.json({ adminId: admin.adminId, name: admin.name });
  res.cookies.set(ADMIN_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
