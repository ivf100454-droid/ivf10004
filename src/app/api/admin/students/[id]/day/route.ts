import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getSignedDownloadUrl } from "@/lib/storage";
import { isAcademyToday } from "@/lib/timezone";

/**
 * 관리자가 특정 학생의 "특정 날짜" 체크리스트(제출물 포함)를 조회한다.
 * /api/admin/students/[id]/today와 로직은 같되, 오늘이 아니라 쿼리로 받은
 * date(YYYY-MM-DD)를 기준으로 과거/미래 날짜도 조회할 수 있다.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const dateStr = req.nextUrl.searchParams.get("date");
  if (!dateStr) return NextResponse.json({ error: "date 쿼리가 필요합니다." }, { status: 400 });

  const student = await prisma.student.findUnique({ where: { studentId: params.id } });
  if (!student) return NextResponse.json({ error: "존재하지 않는 학생입니다." }, { status: 404 });

  const checklistDate = new Date(`${dateStr}T00:00:00.000Z`);

  const assignments = await prisma.checklistAssignment.findMany({
    where: { studentId: student.studentId, checklistDate },
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

  const allItems = assignments.flatMap((a) => a.items);
  const progressItems = allItems.filter((i) => i.isProgressItem);
  const completedCount = progressItems.filter((i) => i.completed).length;
  const progress =
    progressItems.length === 0 ? 0 : Math.round((completedCount / progressItems.length) * 100);

  const assignmentsOut = await Promise.all(
    assignments.map(async (a) => ({
      assignmentId: a.assignmentId,
      reopenedForEditing: a.reopenedForEditing,
      preservedByAdmin: a.preservedByAdmin,
      deletionScheduledDate: (() => {
        const d = new Date(a.checklistDate);
        d.setUTCDate(d.getUTCDate() + 30);
        return d.toISOString().slice(0, 10);
      })(),
      items: await Promise.all(
        a.items.map(async (item) => {
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
      ),
    }))
  );

  return NextResponse.json({
    studentName: student.name,
    date: dateStr,
    isToday: isAcademyToday(dateStr),
    progress,
    assignments: assignmentsOut,
  });
}
