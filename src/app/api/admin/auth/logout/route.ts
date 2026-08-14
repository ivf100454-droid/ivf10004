import { NextRequest, NextResponse } from "next/server";
import { revokeAdminSession } from "@/lib/adminAuth";

const ADMIN_SESSION_COOKIE = "admin_session_token";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await revokeAdminSession(token);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_SESSION_COOKIE);
  return res;
}
