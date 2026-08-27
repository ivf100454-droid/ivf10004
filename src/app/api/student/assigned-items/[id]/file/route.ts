import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { isAssignmentEditable } from "@/lib/timezone";
import { uploadToR2, getSignedDownloadUrl } from "@/lib/storage";

// "파일 제출"은 형식을 가리지 않는 범용 업로드다 — 사진/PDF/음성/영상/문서 무엇이든
// 받는다. 개별 사진/음성/영상 제출과 달리 MIME 타입 화이트리스트를 두지 않는다.
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function evaluateCompleted(
  required: string[],
  checked: boolean,
  currentCount: number,
  targetCount: number | null,
  score: number | null,
  justSubmittedFile: boolean
) {
  if (required.length === 0) return checked === true;
  return required.every(function (feature) {
    if (feature === "check") return checked === true;
    if (feature === "count") return targetCount != null && currentCount >= targetCount;
    if (feature === "score") return score !== null && score !== undefined;
    if (feature === "photoSubmission") return false;
    if (feature === "audioSubmission") return false;
    if (feature === "videoSubmission") return false;
    if (feature === "fileSubmission") return justSubmittedFile;
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

  if (!item.hasFileSubmission) {
    return NextResponse.json({ error: "이 항목은 파일 제출 기능이 꺼져 있습니다." }, { status: 400 });
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
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "파일이 너무 큽니다 (최대 50MB)." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileId = randomUUID();
  const storageKey = "files/" + item.assignedItemId + "/" + fileId;

  await uploadToR2(storageKey, buffer, file.type || "application/octet-stream");

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
        originalFilename: file.name || "file",
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        uploadedBy: student.accountId,
      },
    });

    await tx.fileSubmission.updateMany({
      where: { assignedItemId: item.assignedItemId, status: "current" },
      data: { status: "superseded" },
    });

    const submission = await tx.fileSubmission.create({
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

  const submission = await prisma.fileSubmission.findFirst({
    where: { assignedItemId: params.id, status: "current" },
    include: { file: true },
    orderBy: { submittedAt: "desc" },
  });
  if (!submission) {
    return NextResponse.json({ error: "제출된 파일이 없습니다." }, { status: 404 });
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

  const submission = await prisma.fileSubmission.findFirst({
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
    await tx.fileSubmission.update({
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
