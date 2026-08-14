import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

const SESSION_COOKIE = "session_token";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.loginId || !body?.password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해주세요." }, { status: 400 });
  }

  // 활성 계정에서만 조회 — disabled 계정의 login_id가 재사용된 경우
  // 새로 활성화된 계정만 정상적으로 매칭되어야 한다(6번 요구사항).
  const account = await prisma.studentAccount.findFirst({
    where: { loginId: body.loginId, accountStatus: "enabled" },
    include: { student: true },
  });

  // 계정이 없거나 비밀번호가 틀려도 동일한 에러 메시지로 응답한다.
  // (아이디 존재 여부를 노출하지 않기 위한 일반적인 보안 관행)
  const invalidResponse = () =>
    NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });

  if (!account) return invalidResponse();

  const ok = await verifyPassword(body.password, account.passwordHash);
  if (!ok) return invalidResponse();

  if (account.student.studentStatus === "withdrawn") {
    // 이중 방어: account_status는 disabled로 함께 바뀌었어야 하지만
    // 데이터 정합성이 깨진 경우에도 로그인은 차단한다.
    return invalidResponse();
  }

  const { rawToken } = await createSession(account.accountId);

  const res = NextResponse.json({
    studentId: account.studentId,
    name: account.student.name,
  });
  res.cookies.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
