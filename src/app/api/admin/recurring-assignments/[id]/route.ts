import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { pauseRecurring, resumeRecurring, endRecurring, updateActiveDays } from "@/lib/recurringAssignments";

/**
 * 반복배정 1건의 상태를 변경한다.
 * body: { action: "pause" | "resume" | "end" } 또는 { activeDays: number[] }
 *
 * 일시정지/종료해도 이미 생성된 과거 일일 체크리스트는 그대로 보존된다 (소프트 처리) —
 * 이 API는 앞으로의 자동 생성 여부만 바꾼다.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const existing = await prisma.recurringAssignment.findUnique({ where: { recurringAssignmentId: params.id } });
  if (!existing) return NextResponse.json({ error: "존재하지 않는 반복배정입니다." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "요청 본문이 필요합니다." }, { status: 400 });

  let updated = existing;

  if (body.action === "pause") {
    updated = await pauseRecurring(existing.recurringAssignmentId);
  } else if (body.action === "resume") {
    updated = await resumeRecurring(existing.recurringAssignmentId);
  } else if (body.action === "end") {
    updated = await endRecurring(existing.recurringAssignmentId);
  } else if (Array.isArray(body.activeDays)) {
    const days = body.activeDays.filter((d: unknown) => typeof d === "number" && d >= 0 && d <= 6);
    updated = await updateActiveDays(existing.recurringAssignmentId, days);
  } else {
    return NextResponse.json({ error: "action(pause/resume/end) 또는 activeDays가 필요합니다." }, { status: 400 });
  }

  return NextResponse.json({
    recurringAssignmentId: updated.recurringAssignmentId,
    status: updated.status,
    activeDays: updated.activeDays,
    startDate: updated.startDate,
    endDate: updated.endDate,
  });
}
