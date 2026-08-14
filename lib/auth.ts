import bcrypt from "bcryptjs";
import { randomUUID, createHash } from "crypto";
import { prisma } from "./db";

// 비밀번호 해시: bcryptjs 공식 권장 cost factor. 평문 저장 금지(5번, 36-8번 요구사항).
const BCRYPT_ROUNDS = 12;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14일

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * 로그인 성공 시 세션을 생성한다. 세션은 auth_sessions 테이블에 저장되는
 * DB 기반 세션이므로(8번, 19번 요구사항), disable/퇴원 시 즉시 무효화가 가능하다.
 * JWT처럼 서버 상태 없이 자체 검증되는 stateless 토큰은 즉시 무효화가 어려워 채택하지 않았다.
 */
export async function createSession(accountId: string) {
  const rawToken = randomUUID() + randomUUID(); // 클라이언트 쿠키에 저장될 원본 토큰
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const session = await prisma.authSession.create({
    data: {
      accountId,
      refreshTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  return { sessionId: session.sessionId, rawToken };
}

/**
 * 세션 토큰을 검증한다. 아래 세 조건을 모두 만족해야 유효:
 *   1. 해당 해시의 세션이 DB에 존재
 *   2. revokedAt이 null (퇴원/비활성화로 무효화되지 않음)
 *   3. expiresAt이 아직 지나지 않음
 * 반환값이 null이면 호출부는 401을 응답해야 한다.
 */
export async function validateSession(rawToken: string) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const session = await prisma.authSession.findFirst({
    where: {
      refreshTokenHash: tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { account: { include: { student: true } } },
  });

  if (!session) return null;
  if (session.account.accountStatus !== "enabled") return null; // 이중 방어
  if (session.account.student.studentStatus === "withdrawn") return null; // 이중 방어

  return session;
}

/** 특정 계정의 모든 세션을 무효화한다. 퇴원/비활성화 처리 시 반드시 함께 호출한다. */
export async function revokeAllSessionsForAccount(accountId: string) {
  await prisma.authSession.updateMany({
    where: { accountId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeSession(rawToken: string) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await prisma.authSession.updateMany({
    where: { refreshTokenHash: tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
