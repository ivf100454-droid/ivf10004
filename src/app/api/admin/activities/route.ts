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

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const activities = await prisma.activity.findMany({
    include: { materialVideo: true, materialPhotoFile: true, materialDocFile: true },
    orderBy: { createdAt: "desc" },
  });

  const out = await Promise.all(activities.map(serializeActivity));
  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

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

  const anySubmit = hasCheck || hasCount || hasScore || hasPhotoSubmission || hasAudioSubmission || hasVideoSubmission || hasFileSubmission;

  const materialLinkUrl = String(formData.get("materialLinkUrl") || "").trim() || null;
  const materialVideoId = String(formData.get("materialVideoId") || "").trim() || null;
  if (materialVideoId) {
    const video = await prisma.teachingVideo.findUnique({ where: { videoId: materialVideoId } });
    if (!video) return NextResponse.json({ error: "존재하지 않는 학습영상입니다." }, { status: 400 });
  }

  const photoFile = formData.get("materialPhotoFile");
  const docFile = formData.get("materialDocFile");

  let materialPhotoFileId: string | null = null;
  let materialDocFileId: string | null = null;

  const anyMaterial = !!materialLinkUrl || !!materialVideoId || (photoFile instanceof File) || (docFile instanceof File);

  if (!anySubmit && !anyMaterial) {
    return NextResponse.json({ error: "최소 하나의 항목을 선택하세요." }, { status: 400 });
  }

  const activityId = await prisma.$transaction(async function (tx) {
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

    const activity = await tx.activity.create({
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
    });

    return activity.activityId;
  }).catch(function (e) {
    return { error: e.message || "저장에 실패했습니다." };
  });

  if (typeof activityId !== "string") {
    return NextResponse.json({ error: (activityId as { error: string }).error }, { status: 400 });
  }

  return NextResponse.json({ activityId: activityId, name: name }, { status: 201 });
}
