import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/adminAuth";

/**
 * 최초 관리자 계정 부트스트랩 전용 엔드포인트.
 *
 * administrators 테이블이 완전히 비어있을 때만 동작한다 — 즉 이 앱을 처음
 * 배포한 직후, 관리자 계정이 하나도 없는 상태에서 딱 한 번만 쓸 수 있다.
 * 관리자가 1명이라도 존재하면 이후 모든 요청은 403으로 거부되므로,
 * 로그인 API처럼 인증 없이 열려있어도 무제한 오남용은 불가능하다.
 *
 * 주의(운영 전환 시 반드시 확인): 이 엔드포인트는 MVP 검증 단계의 임시
 * 부트스트랩 수단이다. 실제 서비스로 전환하기 전에는 이 라우트를 완전히
 * 삭제하거나, 별도의 관리자 초대/승인 절차로 교체하는 것을 권장한다 —
 * "관리자가 아직 없다"는 조건만으로 인증을 대신하는 것은 첫 배포 직후의
 * 짧은 창(window)에서만 안전하다고 볼 수 있다.
 */
export async function POST(req: NextRequest) {
  const existingCount = await prisma.administrator.count();
  if (existingCount > 0) {
    return NextResponse.json(
      { error: "이미 관리자 계정이 존재합니다. 이 엔드포인트는 최초 1회만 사용할 수 있습니다." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.loginId || !body?.password) {
    return NextResponse.json(
      { error: "이름, 아이디, 비밀번호를 모두 입력해주세요." },
      { status: 400 }
    );
  }
  if (body.password.length < 8) {
    return NextResponse.json(
      { error: "비밀번호는 8자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(body.password);

  const admin = await prisma.administrator.create({
    data: {
      name: body.name,
      loginId: body.loginId,
      passwordHash,
    },
  });

  return NextResponse.json(
    { ok: true, adminId: admin.adminId, loginId: admin.loginId },
    { status: 201 }
  );
}
