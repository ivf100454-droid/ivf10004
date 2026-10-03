import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { isAssignmentEditable } from "@/lib/timezone";

/**
 * 학생용 QR 스캔 저장 API.
 * - POST   { url: "스캔한 내용" } — 링크든 글자든 QR에 담긴 내용을 그대로 저장하고 완료 여부를 다시 계산
 * - DELETE — 스캔 기록을 지우고 완료 여부를 다시 계산 (다시 스캔하기 전에 사용)
 * 본인 항목 + 오늘(수정 가능한) 항목만 처리한다.
 */

const MAX_QR_LENGTH = 2000;

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

async function getOwnedItem(studentId: string, assignedItemId: string) {
  const item = await prisma.assignedChecklistItem.findUnique({
    where: { assignedItemId: assignedItemId },
    include: { assignment: true },
  });
  if (!item) return { error: "존재하지 않는 항목입니다.", status: 404 } as const;
  if (item.assignment.studentId !== studentId) {
    return { error: "본인의 체크리스트만 수정할 수 있습니다.", status: 403 } as const;
  }
  return { item } as const;
}

async function recompute(
  item: {
    assignedItemId: string;
    requiredFeatures: unknown;
    checked: boolean;
    currentCount: number;
    targetCount: number | null;
    score: number | null;
  },
  qrDone: boolean
) {
  const [currentPhoto, currentAudio, currentVideo, currentFile] = await Promise.all([
    prisma.photoSubmission.findFirst({ where: { assignedItemId: item.assignedItemId, status: "current" } }),
    prisma.audioSubmission.findFirst({ where: { assignedItemId: item.assignedItemId, status: "current" } }),
    prisma.videoSubmission.findFirst({ where: { assignedItemId: item.assignedItemId, status: "current" } }),
    prisma.fileSubmission.findFirst({ where: { assignedItemId: item.assignedItemId, status: "current" } }),
  ]);
  const required: string[] = Array.isArray(item.requiredFeatures) ? (item.requiredFeatures as string[]) : [];
  return evaluateCompleted(
    required,
    item.checked,
    item.currentCount,
    item.targetCount,
    item.score,
    !!currentPhoto,
    !!currentAudio,
    !!currentVideo,
    !!currentFile,
    qrDone
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const student = await getStudentFromRequest(req);
  if (!student) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const check = await getOwnedItem(student.studentId, params.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });
  const item = check.item;

  if (!item.hasQrScan) {
    return NextResponse.json({ error: "이 항목은 QR 스캔 기능이 꺼져 있습니다." }, { status: 400 });
  }
  if (!isAssignmentEditable(item.assignment)) {
    return NextResponse.json({ error: "과거 날짜의 항목은 수정할 수 없습니다." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const content = typeof body?.url === "string" ? body.url.trim() : "";
  if (!content) return NextResponse.json({ error: "QR 내용이 비어 있습니다." }, { status: 400 });
  if (content.length > MAX_QR_LENGTH) {
    return NextResponse.json({ error: "QR 내용이 너무 깁니다." }, { status: 400 });
  }

  const completed = await recompute(item, true);
  const now = new Date();
  await prisma.assignedChecklistItem.update({
    where: { assignedItemId: item.assignedItemId },
    data: {
      qrScannedUrl: content,
      qrScannedAt: now,
      completed: completed,
      completedAt: completed ? item.completedAt || now : null,
    },
  });

  return NextResponse.json({ ok: true, url: content, scannedAt: now, completed: completed });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const student = await getStudentFromRequest(req);
  if (!student) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const check = await getOwnedItem(student.studentId, params.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });
  const item = check.item;

  if (!isAssignmentEditable(item.assignment)) {
    return NextResponse.json({ error: "과거 날짜의 항목은 수정할 수 없습니다." }, { status: 403 });
  }

  const completed = await recompute(item, false);
  await prisma.assignedChecklistItem.update({
    where: { assignedItemId: item.assignedItemId },
    data: {
      qrScannedUrl: null,
      qrScannedAt: null,
      completed: completed,
      completedAt: completed ? item.completedAt : null,
    },
  });

  return NextResponse.json({ ok: true, completed: completed });
}
