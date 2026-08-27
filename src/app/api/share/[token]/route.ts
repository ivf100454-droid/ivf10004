import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage";

async function mapSharedItem(item: any) {
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
}

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

  const rangeDays = shareLink.rangeDays || 1;
  const start = shareLink.checklistDate;
  const dateList: Date[] = [];
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    dateList.push(d);
  }
  const endDate = dateList[dateList.length - 1];

  const assignments = await prisma.checklistAssignment.findMany({
    where: { studentId: shareLink.studentId, checklistDate: { gte: start, lte: endDate } },
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
    orderBy: { checklistDate: "asc" },
  });

  const byDateKey = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const key = a.checklistDate.toISOString().slice(0, 10);
    if (!byDateKey.has(key)) byDateKey.set(key, []);
    byDateKey.get(key)!.push(a);
  }

  const daysOut = [];
  for (const d of dateList) {
    const key = d.toISOString().slice(0, 10);
    const dayAssignments = byDateKey.get(key) || [];
    const dayItems = dayAssignments.flatMap((a) => a.items);
    const progressItems = dayItems.filter((i) => i.isProgressItem);
    const completedCount = progressItems.filter((i) => i.completed).length;
    const progress = progressItems.length === 0 ? 0 : Math.round((completedCount / progressItems.length) * 100);

    const assignmentsOut = await Promise.all(
      dayAssignments.map(async (a) => ({
        assignmentId: a.assignmentId,
        instruction: a.instruction,
        items: await Promise.all(a.items.map(mapSharedItem)),
      }))
    );

    daysOut.push({ date: key, progress, hasRecord: dayAssignments.length > 0, assignments: assignmentsOut });
  }

  const allProgressItems = assignments.flatMap((a) => a.items).filter((i) => i.isProgressItem);
  const overallCompleted = allProgressItems.filter((i) => i.completed).length;
  const overallProgress =
    allProgressItems.length === 0 ? 0 : Math.round((overallCompleted / allProgressItems.length) * 100);

  return NextResponse.json({
    studentName: shareLink.student.name,
    rangeDays,
    startDate: dateList[0].toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    overallProgress,
    days: daysOut,
  });
}
