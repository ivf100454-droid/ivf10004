import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { uploadToR2, getSignedDownloadUrl } from "@/lib/storage";

const MAX_TEACHING_VIDEO_SIZE = 200 * 1024 * 1024;
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/3gpp", "video/x-m4v"];

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const videos = await prisma.teachingVideo.findMany({
    include: { file: true },
    orderBy: { createdAt: "desc" },
  });

  const out = await Promise.all(
    videos.map(async function (v) {
      return {
        videoId: v.videoId,
        title: v.title,
        description: v.description,
        createdAt: v.createdAt,
        filename: v.file.originalFilename,
        sizeBytes: v.file.sizeBytes,
        url: await getSignedDownloadUrl(v.file.storageKey, 600),
      };
    })
  );

  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const formData = await req.formData().catch(function () {
    return null;
  });
  const file = formData ? formData.get("file") : null;
  const title = formData ? formData.get("title") : null;
  const description = formData ? formData.get("description") : null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file 필드가 필요합니다." }, { status: 400 });
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "영상 제목이 필요합니다." }, { status: 400 });
  }
  if (ALLOWED_TYPES.indexOf(file.type) === -1) {
    return NextResponse.json({ error: "지원하지 않는 영상 파일 형식입니다." }, { status: 400 });
  }
  if (file.size > MAX_TEACHING_VIDEO_SIZE) {
    return NextResponse.json({ error: "파일이 너무 큽니다 (최대 200MB)." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileId = randomUUID();
  const storageKey = "teaching-videos/" + fileId;

  await uploadToR2(storageKey, buffer, file.type);

  const video = await prisma.$transaction(async function (tx) {
    const fileMeta = await tx.fileMetadata.create({
      data: {
        fileId: fileId,
        storageKey: storageKey,
        originalFilename: file.name || "teaching-video",
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedBy: admin.adminId,
      },
    });

    return tx.teachingVideo.create({
      data: {
        title: title.trim(),
        description: typeof description === "string" && description.trim() ? description.trim() : null,
        fileId: fileMeta.fileId,
        createdByAdminId: admin.adminId,
      },
    });
  });

  return NextResponse.json({ videoId: video.videoId, title: video.title }, { status: 201 });
}
