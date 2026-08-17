import { NextRequest } from "next/server";
import { validateSession } from "./auth";

const SESSION_COOKIE = "session_token";

/**
 * 학생 로그인 API(/api/auth/login)가 심어둔 session_token 쿠키를 읽어
 * 현재 로그인한 학생을 반환한다. 관리자의 getAdminFromRequest와 대응되는
 * 학생용 버전 — 관리자 세션(admin_sessions)과는 완전히 분리된 테이블을 쓴다.
 */
export async function getStudentFromRequest(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await validateSession(token);
  if (!session) return null;

  return {
    studentId: session.account.studentId,
    accountId: session.account.accountId,
    name: session.account.student.name,
  };
}
