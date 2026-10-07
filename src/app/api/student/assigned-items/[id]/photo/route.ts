import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { isAssignmentEditable } from "@/lib/timezone";
import { uploadToR2, getSignedDownloadUrl } from "@/lib/storage";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_PDF_SIZE = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ALLOWED_PDF_TYPES = ["application/pdf"];
const ALLOWED_TYPES = ALLOWED_IMAGE_TYPES.concat(ALLOWED_PDF_TYPES);
// 한 항목당 학생이 올릴 수 있는 사진(PDF 포함) 최대 개수 — 1장만 올려도 완료 처리됨
const MAX_PHOTOS_PER_ITEM = 3;

function evaluateCompleted(
  required: string[],
  checked: boolean,
  currentCount: number,
  targetCount: number | null,
  score: number | null,
  justSubmittedPhoto: boolean,
  hasQrScanDone: boolean
) {
  if (required.length === 0) return checked === true;
  return required.every(function (feature) {
    if (feature === "check") return checked === true;
    if (feature === "count") return targetCount != null && currentCount >= targetCount;
    if (feature === "score") return score !== null && score !== undefined;
    if (feature === "photoSubmission") return justSubmittedPhoto;
    if (feature === "audioSubmission") return false;
    if (feature === "videoSubmission") return false;
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const student = await getStudentFromRequest(req);
  if (!student) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const check = await getOwnedItem(student.studentId, params.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });
  const item = check.item;

  if (!item.hasPhotoSubmission) {
    return NextResponse.json({ error: "이 항목은 사진 제출 기능이 꺼져 있습니다." }, { status: 400 });
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
    return NextResponse.json({ error: "지원하지 않는 파일 형식입니다 (이미지 또는 PDF만 가능)." }, { status: 400 });
  }
  const isPdf = file.type === "application/pdf";
  const maxSize = isPdf ? MAX_PDF_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    const limitLabel = isPdf ? "15MB" : "8MB";
    return NextResponse.json({ error: "파일이 너무 큽니다 (최대 " + limitLabel + ")." }, { status: 400 });
  }

  const existingCount = await prisma.photoSubmission.count({
    where: { assignedItemId: item.assignedItemId, status: "current" },
  });
  if (existingCount >= MAX_PHOTOS_PER_ITEM) {
    return NextResponse.json(
      { error: "사진은 최대 " + MAX_PHOTOS_PER_ITEM + "장까지 올릴 수 있어요." },
      { status: 400 }
    );
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
    true,
    !!item.qrScannedAt
  );

  const submissionId = await prisma.$transaction(async function (tx) {
    const fileMeta = await tx.fileMetadata.create({
      data: {
        fileId: fileId,
        storageKey: storageKey,
        originalFilename: file.name || (isPdf ? "document.pdf" : "photo.jpg"),
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedBy: student.accountId,
      },
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
        // 이미 완료된 항목에 사진을 추가로 올려도 처음 완료된 시각은 그대로 둔다.
        completedAt: completed ? item.completedAt || new Date() : null,
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

  const submissions = await prisma.photoSubmission.findMany({
    where: { assignedItemId: params.id, status: "current" },
    include: { file: true },
    orderBy: { submittedAt: "asc" },
  });

  const photos = await Promise.all(
    submissions.map(async function (s) {
      return {
        submissionId: s.submissionId,
        url: await getSignedDownloadUrl(s.file.storageKey, 300),
        submittedAt: s.submittedAt,
        mimeType: s.file.mimeType,
        filename: s.file.originalFilename,
      };
    })
  );

  return NextResponse.json({ photos: photos, maxPhotos: MAX_PHOTOS_PER_ITEM });
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

  // ?submissionId= 로 지울 사진 한 장을 지정한다. 지정이 없으면 가장 최근 사진을 지운다.
  const submissionId = req.nextUrl.searchParams.get("submissionId");
  const submission = await prisma.photoSubmission.findFirst({
    where: submissionId
      ? { submissionId: submissionId, assignedItemId: item.assignedItemId, status: "current" }
      : { assignedItemId: item.assignedItemId, status: "current" },
    orderBy: { submittedAt: "desc" },
  });
  if (!submission) {
    return NextResponse.json({ error: "삭제할 파일이 없습니다." }, { status: 404 });
  }

  // 지우고 나서도 사진이 1장 이상 남아 있으면 사진 제출 조건은 계속 충족된 것으로 본다.
  const remainingCount = await prisma.photoSubmission.count({
    where: {
      assignedItemId: item.assignedItemId,
      status: "current",
      NOT: { submissionId: submission.submissionId },
    },
  });

  const required: string[] = Array.isArray(item.requiredFeatures)
    ? (item.requiredFeatures as string[])
    : [];
  const completed = evaluateCompleted(
    required,
    item.checked,
    item.currentCount,
    item.targetCount,
    item.score,
    remainingCount > 0,
    !!item.qrScannedAt
  );

  await prisma.$transaction(async function (tx) {
    await tx.photoSubmission.update({
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
