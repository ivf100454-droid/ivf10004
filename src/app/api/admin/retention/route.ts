import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { runRetentionCleanup } from "@/lib/retentionCleanup";

/**
 * 30일 보존기간이 지난 기록을 정리한다.
 * body: { dryRun: boolean } — dryRun=true면 실제로 아무것도 지우지 않고 대상 목록만 반환한다.
 * 파괴적인 작업이므로 항상 관리자가 명시적으로 호출할 때만 실행된다(자동 스케줄 없음).
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false; // 기본값은 안전하게 dryRun=true

  const result = await runRetentionCleanup({ dryRun, triggeredBy: "manual" });
  return NextResponse.json(result);
}

/** 최근 정리 실행 감사 로그를 최신순으로 반환한다. */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const { prisma } = await import("@/lib/db");
  const logs = await prisma.retentionAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(logs);
}
