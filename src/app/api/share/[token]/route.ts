import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const shareLink = await prisma.shareLink.findUnique({
    where: { token: params.token },
    include: { student: true },
  });
  if (!shareLink) {
    return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 });
  }
  if (shareLink.revokedAt) {
    return NextResponse.json({ error: "취소된 링크입니다." }, { status: 410 });
  }
  if (shareLink.expiresAt && shareLink.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "만료된 링크입니다." }, { status: 410 });
  }

  const dateStr = shareLink.checklistDate.toISOString().slice(0, 10);

  const assignments = await prisma.checklistAssignment.findMany({
    where: {
      studentId: shareLink.studentId,
      checklistDate: shareLink.checklistDate,
    },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          photoSubmissions: { where: { status: "current" }, include: { file: true } },
          audioSubmissions: { where: { status: "current" }, include: { file: true } },
          videoSubmissions: { where: { status: "current" }, include: { file: true } },
          fileSubmissions: { where: { status: "current" }, include: { file: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const allItems = assignments.flatMap(function (a) {
    return a.items;
  });
  const progressItems = allItems.filter(function (i) {
    return i.isProgressItem;
  });
  const completedCount = progressItems.filter(function (i) {
    return i.completed;
  }).length;
  const progress =
    progressItems.length === 0 ? 0 : Math.round((completedCount / progressItems.length) * 100);

  const assignmentsOut = await Promise.all(
    assignments.map(async function (a) {
      const itemsOut = await Promise.all(
        a.items.map(async function (item) {
          const photo = item.photoSubmissions[0];
          const audio = item.audioSubmissions[0];
          const video = item.videoSubmissions[0];
          const file = item.fileSubmissions[0];

          return {
            assignedItemId: item.assignedItemId,
            title: item.title,
            hasCheck: item.hasCheck,
            checked: item.checked,
            hasCount: item.hasCount,
            currentCount: item.currentCount,
            targetCount: item.targetCount,
            hasScore: item.hasScore,
            score: item.score,
            maxScore: item.maxScore,
            linkUrl: item.linkUrl,
            linkLabel: item.linkLabel,
            hasPhotoSubmission: item.hasPhotoSubmission,
            hasAudioSubmission: item.hasAudioSubmission,
            hasVideoSubmission: item.hasVideoSubmission,
            hasFileSubmission: item.hasFileSubmission,
            completed: item.completed,
            photoUrl: photo ? await getSignedDownloadUrl(photo.file.storageKey, 600) : null,
            photoMimeType: photo ? photo.file.mimeType : null,
            photoFilename: photo ? photo.file.originalFilename : null,
            audioUrl: audio ? await getSignedDownloadUrl(audio.file.storageKey, 600) : null,
            audioFilename: audio ? audio.file.originalFilename : null,
            videoUrl: video ? await getSignedDownloadUrl(video.file.storageKey, 600) : null,
            videoFilename: video ? video.file.originalFilename : null,
            fileUrl: file ? await getSignedDownloadUrl(file.file.storageKey, 600) : null,
            fileMimeType: file ? file.file.mimeType : null,
            fileFilename: file ? file.file.originalFilename : null,
          };
        })
      );
      return { assignmentId: a.assignmentId, items: itemsOut };
    })
  );

  return NextResponse.json({
    studentName: shareLink.student.name,
    date: dateStr,
    progress: progress,
    assignments: assignmentsOut,
  });
}
