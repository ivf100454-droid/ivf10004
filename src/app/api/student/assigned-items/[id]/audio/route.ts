import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { isAssignmentEditable } from "@/lib/timezone";
import { uploadToR2, getSignedDownloadUrl } from "@/lib/storage";

const MAX_AUDIO_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/wave",
  "audio/webm",
  "audio/ogg",
  "audio/3gpp",
];

function evaluateCompleted(
  required: string[],
  checked: boolean,
  currentCount: number,
  targetCount: number | null,
  score: number | null,
  justSubmittedAudio: boolean
) {
  if (required.length === 0) return checked === true;
  return required.every(function (feature) {
    if (feature === "check") return checked === true;
    if (feature === "count") return targetCount != null && currentCount >= targetCount;
    if (feature === "score") return score !== null && score !== undefined;
    if (feature === "photoSubmission") return false;
    if (feature === "audioSubmission") return justSubmittedAudio;
    if (feature === "videoSubmission") return false;
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const student = await getStudentFromRequest(req);
  if (!student) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const check = await getOwnedItem(student.studentId, params.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });
  const item = check.item;

  if (!item.hasAudioSubmission) {
    return NextResponse.json({ error: "이 항목은 음성 제출 기능이 꺼져 있습니다." }, { status: 400 });
  }
  if (!isAssignmentEditable(item.assignment)) {
    return NextResponse.json({ error: "과거 날짜의 항목은 수정할 수 없습니다." }, { status: 403 });
  }

  const formData = await req.formData().catch(function () {
    return null;
  });
  const file = formData ? formData.get("file") : null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file 필드가 필요합니다." }, { status: 400 });
  }
  if (ALLOWED_TYPES.indexOf(file.type) === -1) {
    return NextResponse.json({ error: "지원하지 않는 음성 파일 형식입니다." }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_SIZE) {
    return NextResponse.json({ error: "파일이 너무 큽니다 (최대 20MB)." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileId = randomUUID();
  const storageKey = "audio/" + item.assignedItemId + "/" + fileId;

  await uploadToR2(storageKey, buffer, file.type);

  const required: string[] = Array.isArray(item.requiredFeatures)
    ? (item.requiredFeatures as string[])
    : [];
  const completed = evaluateCompleted(
    required,
    item.checked,
    item.currentCount,
    item.targetCount,
    item.score,
    true
  );

  const submissionId = await prisma.$transaction(async function (tx) {
    const fileMeta = await tx.fileMetadata.create({
      data: {
        fileId: fileId,
        storageKey: storageKey,
        originalFilename: file.name || "audio",
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedBy: student.accountId,
      },
    });

    await tx.audioSubmission.updateMany({
      where: { assignedItemId: item.assignedItemId, status: "current" },
      data: { status: "superseded" },
    });

    const submission = await tx.audioSubmission.create({
      data: {
        assignedItemId: item.assignedItemId,
        studentId: item.assignment.studentId,
        fileId: fileMeta.fileId,
        status: "current",
      },
    });

    await tx.assignedChecklistItem.update({
      where: { assignedItemId: item.assignedItemId },
      data: {
        completed: completed,
        completedAt: completed ? new Date() : null,
      },
    });

    return submission.submissionId;
  });

  return NextResponse.json({ ok: true, submissionId: submissionId }, { status: 201 });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const student = await getStudentFromRequest(req);
  if (!student) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const check = await getOwnedItem(student.studentId, params.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const submission = await prisma.audioSubmission.findFirst({
    where: { assignedItemId: params.id, status: "current" },
    include: { file: true },
    orderBy: { submittedAt: "desc" },
  });
  if (!submission) {
    return NextResponse.json({ error: "제출된 음성 파일이 없습니다." }, { status: 404 });
  }

  const url = await getSignedDownloadUrl(submission.file.storageKey, 300);
  return NextResponse.json({
    url: url,
    submittedAt: submission.submittedAt,
    mimeType: submission.file.mimeType,
    filename: submission.file.originalFilename,
  });
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

  const submission = await prisma.audioSubmission.findFirst({
    where: { assignedItemId: item.assignedItemId, status: "current" },
    orderBy: { submittedAt: "desc" },
  });
  if (!submission) {
    return NextResponse.json({ error: "삭제할 파일이 없습니다." }, { status: 404 });
  }

  const required: string[] = Array.isArray(item.requiredFeatures)
    ? (item.requiredFeatures as string[])
    : [];
  const completed = evaluateCompleted(
    required,
    item.checked,
    item.currentCount,
    item.targetCount,
    item.score,
    false
  );

  await prisma.$transaction(async function (tx) {
    await tx.audioSubmission.update({
      where: { submissionId: submission.submissionId },
      data: { status: "superseded" },
    });
    await tx.assignedChecklistItem.update({
      where: { assignedItemId: item.assignedItemId },
      data: {
        completed: completed,
        completedAt: completed ? new Date() : null,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
