import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { isAcademyToday } from "@/lib/timezone";

/**
 * 진행 상태(체크/횟수/점수)를 업데이트하고, requiredFeatures 목록을 기준으로
 * completed를 서버가 다시 계산한다 — 클라이언트가 completed를 직접 보낼 수
 * 없다(46번 원칙: 완료 여부는 항상 서버가 재계산).
 *
 * 20번, 31번 요구사항: 과거 날짜는 수정할 수 없다. 서버가 항상 재확인한다.
 *
 * 이번 배치 범위: photoSubmission/audioSubmission/videoSubmission이 완료조건에
 * 포함된 항목은, 실제 업로드 인프라가 아직 없어서 항상 미완료로 남는다 —
 * 의도된 동작이며 다음 배치(R2 연동)에서 해소된다.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "요청 본문이 필요합니다." }, { status: 400 });

  const item = await prisma.assignedChecklistItem.findUnique({
    where: { assignedItemId: params.id },
    include: { assignment: true },
  });
  if (!item) return NextResponse.json({ error: "존재하지 않는 항목입니다." }, { status: 404 });

  if (!isAcademyToday(item.assignment.checklistDate)) {
    return NextResponse.json({ error: "과거 날짜의 항목은 수정할 수 없습니다." }, { status: 403 });
  }

  const data: Record<string, unknown> = {};

  if (item.hasCheck && typeof body.checked === "boolean") {
    data.checked = body.checked;
  }
  if (item.hasCount && typeof body.currentCount === "number") {
    const clamped = Math.max(0, Math.floor(body.currentCount));
    data.currentCount = clamped;
  }
  if (item.hasScore && (body.score === null || typeof body.score === "number")) {
    data.score = body.score;
    data.scoreUpdatedBy = "admin";
    data.scoreUpdatedAt = body.score === null ? null : new Date();
  }

  const nextChecked = (data.checked as boolean | undefined) ?? item.checked;
  const nextCount = (data.currentCount as number | undefined) ?? item.currentCount;
  const nextScore = "score" in data ? (data.score as number | null) : item.score;

  const required: string[] = Array.isArray(item.requiredFeatures)
    ? (item.requiredFeatures as string[])
    : [];

  const satisfied = required.every((feature) => {
    switch (feature) {
      case "check":
        return nextChecked === true;
      case "count":
        return item.targetCount != null && nextCount >= item.targetCount;
      case "score":
        return nextScore !== null && nextScore !== undefined;
      case "photoSubmission":
      case "audioSubmission":
      case "videoSubmission":
        return false;
      default:
        return false;
    }
  });

  data.completed = required.length > 0 ? satisfied : nextChecked === true;
  data.completedAt = data.completed ? new Date() : null;

  const updated = await prisma.assignedChecklistItem.update({
    where: { assignedItemId: params.id },
    data,
  });

  return NextResponse.json(updated);
}
