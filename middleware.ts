import { NextRequest, NextResponse } from "next/server";

// 참고: Next.js 미들웨어는 Edge 런타임에서 실행되어 Prisma(Node.js 런타임 필요)를
// 직접 호출할 수 없다(공식 문서 기준 — 확인 필요 없음, 알려진 제약).
// 따라서 여기서는 쿠키 존재 여부만 가볍게 확인해 미로그인 요청을 빠르게 걷어내고,
// 실제 세션 유효성(revoked/expired) 검증은 각 API route handler에서
// validateSession()으로 다시 수행한다. "가장 중요한 권한 판정은 서버에서
// 수행한다"(19번)는 여기서 두 단계로 나뉘어 있을 뿐, 최종 판정은 항상 Node.js
// 런타임의 validateSession()이 담당한다.

const SESSION_COOKIE = "session_token";
const ADMIN_SESSION_COOKIE = "admin_session_token";

// 로그인 엔드포인트 자체는 쿠키가 없는 게 정상이므로 게이트에서 제외한다.
const ADMIN_LOGIN_PATH = "/api/admin/auth/login";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/student")) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin") && pathname !== ADMIN_LOGIN_PATH) {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

// 참고: 이 미들웨어는 쿠키 "존재 여부"만 확인하는 1차 방어선이다(Edge 런타임
// 제약으로 Prisma 호출 불가 — src/lib/adminAuth.ts 상단 주석 참조). 실제
// revoked/expired 여부는 각 라우트 핸들러의 getAdminFromRequest()/validateSession()이
// 최종 판정한다. 즉 이 미들웨어를 통과했다고 "인증됨"으로 간주하는 코드를
// 라우트 핸들러 안에 추가하면 안 된다.
export const config = {
  matcher: ["/api/student/:path*", "/api/admin/:path*"],
};
