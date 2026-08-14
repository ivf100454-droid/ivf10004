import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { isAcademyToday } from "@/lib/timezone";
import { uploadToR2, getSignedDownloadUrl } from "@/lib/storage";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_PDF_SIZE = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ALLOWED_PDF_TYPES = ["application/pdf"];
const ALLOWED_TYPES = ALLOWED_IMAGE_TYPES.concat(ALLOWED_PDF_TYPES);

function evaluateCompleted(
  required: string[],
  checked: boolean,
  currentCount: number,
  targetCount: number | null,
  score: number | null,
  justSubmittedPhoto: boolean
) {
  if (required.length === 0) return checked === true;
  return required.every(function (feature) {
    if (feature === "check") return checked === true;
    if (feature === "count") return targetCount != null && currentCount >= targetCount;
    if (feature === "score") return score !== null && score !== undefined;
    if (feature === "photoSubmission") return justSubmittedPhoto;
    if (feature === "audioSubmission") return false;
    if (feature === "videoSubmission") return false;
    return false;
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const item = await prisma.assignedChecklistItem.findUnique({
    where: { assignedItemId: params.id },
    include: { assignment: true },
  });
  if (!item) return NextResponse.json({ error: "존재하지 않는 항목입니다." }, { status: 404 });
  if (!item.hasPhotoSubmission) {
    return NextResponse.json({ error: "이 항목은 사진 제출 기능이 꺼져 있습니다." }, { status: 400 });
  }
  if (!isAcademyToday(item.assignment.checklistDate)) {
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
    return NextResponse.json({ error: "지원하지 않는 파일 형식입니다 (이미지 또는 PDF만 가능)." }, { status: 400 });
  }
  const isPdf = file.type === "application/pdf";
  const maxSize = isPdf ? MAX_PDF_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    const limitLabel = isPdf ? "15MB" : "8MB";
    return NextResponse.json({ error: "파일이 너무 큽니다 (최대 " + limitLabel + ")." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileId = randomUUID();
  const storageKey = "photos/" + item.assignedItemId + "/" + fileId;

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
        originalFilename: file.name || (isPdf ? "document.pdf" : "photo.jpg"),
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedBy: admin.adminId,
      },
    });

    await tx.photoSubmission.updateMany({
      where: { assignedItemId: item.assignedItemId, status: "current" },
      data: { status: "superseded" },
    });

    const submission = await tx.photoSubmission.create({
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
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const submission = await prisma.photoSubmission.findFirst({
    where: { assignedItemId: params.id, status: "current" },
    include: { file: true },
    orderBy: { submittedAt: "desc" },
  });
  if (!submission) {
    return NextResponse.json({ error: "제출된 사진이 없습니다." }, { status: 404 });
  }

  const url = await getSignedDownloadUrl(submission.file.storageKey, 300);
  return NextResponse.json({
    url: url,
    submittedAt: submission.submittedAt,
    mimeType: submission.file.mimeType,
    filename: submission.file.originalFilename,
  });
}
