import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { isAcademyToday } from "@/lib/timezone";

function evaluateCompleted(
  required: string[],
  checked: boolean,
  currentCount: number,
  targetCount: number | null,
  score: number | null,
  hasCurrentPhoto: boolean,
  hasCurrentAudio: boolean,
  hasCurrentVideo: boolean,
  hasCurrentFile: boolean
) {
  if (required.length === 0) return checked === true;
  return required.every(function (feature) {
    if (feature === "check") return checked === true;
    if (feature === "count") return targetCount != null && currentCount >= targetCount;
    if (feature === "score") return score !== null && score !== undefined;
    if (feature === "photoSubmission") return hasCurrentPhoto;
    if (feature === "audioSubmission") return hasCurrentAudio;
    if (feature === "videoSubmission") return hasCurrentVideo;
    if (feature === "fileSubmission") return hasCurrentFile;
    return false;
  });
}

/**
 * 학생 본인의 체크리스트 항목을 수정한다. 관리자용 PATCH와 로직은 같지만,
 * item.assignment.studentId가 로그인한 학생 본인과 일치하는지 반드시 확인한다 —
 * 이 검증이 없으면 assignedItemId만 알면 다른 학생 데이터를 조작할 수 있게 된다.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const student = await getStudentFromRequest(req);
  if (!student) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const item = await prisma.assignedChecklistItem.findUnique({
    where: { assignedItemId: params.id },
    include: { assignment: true },
  });
  if (!item) return NextResponse.json({ error: "존재하지 않는 항목입니다." }, { status: 404 });
  if (item.assignment.studentId !== student.studentId) {
    return NextResponse.json({ error: "본인의 체크리스트만 수정할 수 있습니다." }, { status: 403 });
  }
  if (!isAcademyToday(item.assignment.checklistDate)) {
    return NextResponse.json({ error: "과거 날짜의 항목은 수정할 수 없습니다." }, { status: 403 });
  }

  const body = await req.json().catch(function () {
    return {};
  });

  const checked = typeof body.checked === "boolean" ? body.checked : item.checked;
  const currentCount =
    typeof body.currentCount === "number" ? body.currentCount : item.currentCount;
  const score = Object.prototype.hasOwnProperty.call(body, "score") ? body.score : item.score;

  const [currentPhoto, currentAudio, currentVideo, currentFile] = await Promise.all([
    prisma.photoSubmission.findFirst({
      where: { assignedItemId: item.assignedItemId, status: "current" },
    }),
    prisma.audioSubmission.findFirst({
      where: { assignedItemId: item.assignedItemId, status: "current" },
    }),
    prisma.videoSubmission.findFirst({
      where: { assignedItemId: item.assignedItemId, status: "current" },
    }),
    prisma.fileSubmission.findFirst({
      where: { assignedItemId: item.assignedItemId, status: "current" },
    }),
  ]);

  const required: string[] = Array.isArray(item.requiredFeatures)
    ? (item.requiredFeatures as string[])
    : [];
  const completed = evaluateCompleted(
    required,
    checked,
    currentCount,
    item.targetCount,
    score,
    !!currentPhoto,
    !!currentAudio,
    !!currentVideo,
    !!currentFile
  );

  const updated = await prisma.assignedChecklistItem.update({
    where: { assignedItemId: item.assignedItemId },
    data: {
      checked: checked,
      currentCount: currentCount,
      score: score,
      scoreUpdatedBy: Object.prototype.hasOwnProperty.call(body, "score") ? "student" : item.scoreUpdatedBy,
      scoreUpdatedAt: Object.prototype.hasOwnProperty.call(body, "score") ? new Date() : item.scoreUpdatedAt,
      completed: completed,
      completedAt: completed ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}
