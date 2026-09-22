import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { isAssignmentEditable } from "@/lib/timezone";

function evaluateCompleted(
  required: string[],
  checked: boolean,
  currentCount: number,
  targetCount: number | null,
  score: number | null,
  hasCurrentPhoto: boolean,
  hasCurrentAudio: boolean,
  hasCurrentVideo: boolean,
  hasCurrentFile: boolean,
  hasQrScanDone: boolean
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
    if (feature === "qrScan") return hasQrScanDone;
    return false;
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const item = await prisma.assignedChecklistItem.findUnique({ where: { assignedItemId: params.id } });
  if (!item) return NextResponse.json({ error: "존재하지 않는 항목입니다." }, { status: 404 });
  if (!item.qrScannedAt) {
    return NextResponse.json({ error: "아직 스캔한 QR이 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ url: item.qrScannedUrl, scannedAt: item.qrScannedAt });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const item = await prisma.assignedChecklistItem.findUnique({
    where: { assignedItemId: params.id },
    include: { assignment: true },
  });
  if (!item) return NextResponse.json({ error: "존재하지 않는 항목입니다." }, { status: 404 });
  if (!isAssignmentEditable(item.assignment)) {
    return NextResponse.json({ error: "과거 날짜의 항목은 수정할 수 없습니다." }, { status: 403 });
  }

  const [currentPhoto, currentAudio, currentVideo, currentFile] = await Promise.all([
    prisma.photoSubmission.findFirst({ where: { assignedItemId: item.assignedItemId, status: "current" } }),
    prisma.audioSubmission.findFirst({ where: { assignedItemId: item.assignedItemId, status: "current" } }),
    prisma.videoSubmission.findFirst({ where: { assignedItemId: item.assignedItemId, status: "current" } }),
    prisma.fileSubmission.findFirst({ where: { assignedItemId: item.assignedItemId, status: "current" } }),
  ]);

  const required: string[] = Array.isArray(item.requiredFeatures)
    ? (item.requiredFeatures as string[])
    : [];
  const completed = evaluateCompleted(
    required,
    item.checked,
    item.currentCount,
    item.targetCount,
    item.score,
    !!currentPhoto,
    !!currentAudio,
    !!currentVideo,
    !!currentFile,
    false
  );

  await prisma.assignedChecklistItem.update({
    where: { assignedItemId: item.assignedItemId },
    data: {
      qrScannedUrl: null,
      qrScannedAt: null,
      completed: completed,
      completedAt: completed ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true });
}
