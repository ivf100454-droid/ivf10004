import { NextRequest, NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth";

const SESSION_COOKIE = "session_token";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await revokeSession(token);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
