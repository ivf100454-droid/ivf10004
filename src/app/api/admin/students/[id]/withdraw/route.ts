import { NextRequest, NextResponse } from "next/server";
import { withdrawStudent } from "@/lib/students";
import { getAdminFromRequest } from "@/lib/adminAuth";

/**
 * 퇴원 처리. 37번 요구사항: 학생/학습기록 유지, 로그인 계정 disabled,
 * 기존 세션 무효화, login_id는 안전하게 해제 후 재사용 가능.
 * withdrawStudent()가 이 세 가지를 순서대로 수행한다 (lib/students.ts 참조).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const account = await withdrawStudent(params.id);
  return NextResponse.json({
    ok: true,
    accountStatus: account.accountStatus,
    disabledAt: account.disabledAt,
  });
}
