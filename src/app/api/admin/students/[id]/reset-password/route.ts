import { NextRequest, NextResponse } from "next/server";
import { resetStudentPassword } from "@/lib/students";
import { getAdminFromRequest } from "@/lib/adminAuth";

function genPassword() {
  return Math.random().toString(36).slice(2, 8);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(function () {
    return {};
  });
  const newPassword =
    typeof body?.newPassword === "string" && body.newPassword.trim() ? body.newPassword.trim() : genPassword();

  await resetStudentPassword(params.id, newPassword);

  return NextResponse.json({ ok: true, newPassword: newPassword });
}
