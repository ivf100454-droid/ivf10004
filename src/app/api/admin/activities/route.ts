import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { uploadToR2, getSignedDownloadUrl } from "@/lib/storage";

const MAX_MATERIAL_SIZE = 15 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

function toBool(v: FormDataEntryValue | null) {
  return v === "true" || v === "1" || v === "on";
}

async function serializeActivity(a: {
  activityId: string;
  name: string;
  hasCheck: boolean;
  hasCount: boolean;
  targetCount: number | null;
  hasScore: boolean;
  maxScore: number | null;
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
  hasFileSubmission: boolean;
  materialLinkUrl: string | null;
  materialVideo: { videoId: string; title: string } | null;
  materialPhotoFile: { storageKey: string; originalFilename: string } | null;
  materialDocFile: { storageKey: string; originalFilename: string } | null;
}) {
  return {
    activityId: a.activityId,
    name: a.name,
    hasCheck: a.hasCheck,
    hasCount: a.hasCount,
    targetCount: a.targetCount,
    hasScore: a.hasScore,
    maxScore: a.maxScore,
    hasPhotoSubmission: a.hasPhotoSubmission,
    hasAudioSubmission: a.hasAudioSubmission,
    hasVideoSubmission: a.hasVideoSubmission,
    hasFileSubmission: a.hasFileSubmission,
    materialLinkUrl: a.materialLinkUrl,
    materialVideo: a.materialVideo ? { videoId: a.materialVideo.videoId, title: a.materialVideo.title } : null,
    materialPhotoUrl: a.materialPhotoFile ? await getSignedDownloadUrl(a.materialPhotoFile.storageKey, 600) : null,
    materialPhotoFilename: a.materialPhotoFile ? a.materialPhotoFile.originalFilename : null,
    materialDocUrl: a.materialDocFile ? await getSignedDownloadUrl(a.materialDocFile.storageKey, 600) : null,
    materialDocFilename: a.materialDocFile ? a.materialDocFile.originalFilename : null,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const activity = await prisma.activity.findUnique({
    where: { activityId: params.id },
    include: { materialVideo: true, materialPhotoFile: true, materialDocFile: true },
  });
  if (!activity) return NextResponse.json({ error: "존재하지 않는 활동입니다." }, { status: 404 });

  return NextResponse.json(await serializeActivity(activity));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const existing = await prisma.activity.findUnique({ where: { activityId: params.id } });
  if (!existing) return NextResponse.json({ error: "존재하지 않는 활동입니다." }, { status: 404 });

  const formData = await req.formData().catch(function () {
    return null;
  });
  if (!formData) return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });

  const name = String(formData.get("name") || "").trim();
  if (!name) return NextResponse.json({ error: "활동명을 입력하세요." }, { status: 400 });

  const hasCheck = toBool(formData.get("hasCheck"));
  const hasCount = toBool(formData.get("hasCount"));
  const targetCountRaw = formData.get("targetCount");
  const targetCount = hasCount && targetCountRaw ? Number(targetCountRaw) : null;
  const hasScore = toBool(formData.get("hasScore"));
  const maxScoreRaw = formData.get("maxScore");
  const maxScore = hasScore ? Number(maxScoreRaw || 100) : null;
  const hasPhotoSubmission = toBool(formData.get("hasPhotoSubmission"));
  const hasAudioSubmission = toBool(formData.get("hasAudioSubmission"));
  const hasVideoSubmission = toBool(formData.get("hasVideoSubmission"));
  const hasFileSubmission = toBool(formData.get("hasFileSubmission"));

  if (hasCount && (!targetCount || targetCount < 1)) {
    return NextResponse.json({ error: "목표 횟수를 입력하세요." }, { status: 400 });
  }
  if (hasScore && (!maxScore || maxScore < 10)) {
    return NextResponse.json({ error: "만점을 입력하세요 (10 이상)." }, { status: 400 });
  }

  const removeLink = toBool(formData.get("removeMaterialLink"));
  const removeVideo = toBool(formData.get("removeMaterialVideo"));
  const removePhoto = toBool(formData.get("removeMaterialPhoto"));
  const removeDoc = toBool(formData.get("removeMaterialDoc"));

  const materialLinkUrlRaw = String(formData.get("materialLinkUrl") || "").trim();
  const materialLinkUrl = removeLink ? null : materialLinkUrlRaw || existing.materialLinkUrl;

  const materialVideoIdRaw = String(formData.get("materialVideoId") || "").trim();
  let materialVideoId = removeVideo ? null : materialVideoIdRaw || existing.materialVideoId;
  if (materialVideoId) {
    const video = await prisma.teachingVideo.findUnique({ where: { videoId: materialVideoId } });
    if (!video) return NextResponse.json({ error: "존재하지 않는 학습영상입니다." }, { status: 400 });
  }

  const photoFile = formData.get("materialPhotoFile");
  const docFile = formData.get("materialDocFile");

  const result = await prisma.$transaction(async function (tx) {
    let materialPhotoFileId = removePhoto ? null : existing.materialPhotoFileId;
    let materialDocFileId = removeDoc ? null : existing.materialDocFileId;

    if (photoFile instanceof File && photoFile.size > 0) {
      if (ALLOWED_PHOTO_TYPES.indexOf(photoFile.type) === -1) {
        throw new Error("참고 사진은 이미지 파일만 가능합니다.");
      }
      if (photoFile.size > MAX_MATERIAL_SIZE) {
        throw new Error("참고 사진 파일이 너무 큽니다 (최대 15MB).");
      }
      const buf = Buffer.from(await photoFile.arrayBuffer());
      const fileId = randomUUID();
      const storageKey = "activity-materials/" + fileId;
      await uploadToR2(storageKey, buf, photoFile.type);
      const meta = await tx.fileMetadata.create({
        data: {
          fileId: fileId,
          storageKey: storageKey,
          originalFilename: photoFile.name || "material-photo",
          mimeType: photoFile.type,
          sizeBytes: photoFile.size,
          uploadedBy: admin.adminId,
        },
      });
      materialPhotoFileId = meta.fileId;
    }

    if (docFile instanceof File && docFile.size > 0) {
      if (docFile.size > MAX_MATERIAL_SIZE) {
        throw new Error("참고 파일이 너무 큽니다 (최대 15MB).");
      }
      const buf = Buffer.from(await docFile.arrayBuffer());
      const fileId = randomUUID();
      const storageKey = "activity-materials/" + fileId;
      await uploadToR2(storageKey, buf, docFile.type || "application/octet-stream");
      const meta = await tx.fileMetadata.create({
        data: {
          fileId: fileId,
          storageKey: storageKey,
          originalFilename: docFile.name || "material-file",
          mimeType: docFile.type || "application/octet-stream",
          sizeBytes: docFile.size,
          uploadedBy: admin.adminId,
        },
      });
      materialDocFileId = meta.fileId;
    }

    const updated = await tx.activity.update({
      where: { activityId: params.id },
      data: {
        name: name,
        hasCheck: hasCheck,
        hasCount: hasCount,
        targetCount: targetCount,
        hasScore: hasScore,
        maxScore: maxScore,
        hasPhotoSubmission: hasPhotoSubmission,
        hasAudioSubmission: hasAudioSubmission,
        hasVideoSubmission: hasVideoSubmission,
        hasFileSubmission: hasFileSubmission,
        materialLinkUrl: materialLinkUrl,
        materialVideoId: materialVideoId,
        materialPhotoFileId: materialPhotoFileId,
        materialDocFileId: materialDocFileId,
      },
      include: { materialVideo: true, materialPhotoFile: true, materialDocFile: true },
    });

    return updated;
  }).catch(function (e) {
    return { error: e.message || "저장에 실패했습니다." };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(await serializeActivity(result));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const existing = await prisma.activity.findUnique({ where: { activityId: params.id } });
  if (!existing) return NextResponse.json({ error: "존재하지 않는 활동입니다." }, { status: 404 });

  const inUse = await prisma.templateItem.findFirst({ where: { activityId: params.id } });
  if (inUse) {
    return NextResponse.json(
      { error: "이 활동은 템플릿에서 사용 중이라 삭제할 수 없습니다. 먼저 템플릿에서 이 활동을 빼주세요." },
      { status: 409 }
    );
  }

  await prisma.activity.delete({ where: { activityId: params.id } });

  return NextResponse.json({ ok: true });
}
