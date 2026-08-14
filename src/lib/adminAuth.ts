import { randomUUID, createHash } from "crypto";
import { prisma } from "./db";

// 학생 인증(auth.ts)과 해시/검증 함수는 재사용하되(hashPassword, verifyPassword는
// bcrypt 알고리즘 자체를 다루므로 주체가 학생이든 관리자든 동일 로직이 맞다),
// 세션 생성/검증/무효화는 admin_sessions 테이블을 대상으로 별도 구현한다.
import { hashPassword as _hashPassword, verifyPassword as _verifyPassword } from "./auth";
   export const hashPassword = _hashPassword;
   export const verifyPassword = _verifyPassword;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14일 — 학생과 동일 정책, 추후 분리 가능

export async function createAdminSession(adminId: string) {
  const rawToken = randomUUID() + randomUUID();
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const session = await prisma.adminSession.create({
    data: {
      adminId,
      refreshTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  return { sessionId: session.sessionId, rawToken };
}

export async function validateAdminSession(rawToken: string) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const session = await prisma.adminSession.findFirst({
    where: {
      refreshTokenHash: tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { admin: true },
  });

  return session; // null이면 호출부가 401 처리
}

export async function revokeAdminSession(rawToken: string) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await prisma.adminSession.updateMany({
    where: { refreshTokenHash: tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * API route handler 안에서 호출하는 가드 함수.
 * 사용 예:
 *   const admin = await requireAdmin(req);
 *   if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
 */
export async function getAdminFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)admin_session_token=([^;]+)/);
  if (!match) return null;
  const session = await validateAdminSession(decodeURIComponent(match[1]));
  return session?.admin ?? null;
}
