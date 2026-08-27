import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { getAcademyToday } from "@/lib/timezone";
import { getSignedDownloadUrl } from "@/lib/storage";
import { computeStreak } from "@/lib/streak";
import { ensureTodayAssignment } from "@/lib/checklistGeneration";

/**
 * 로그인한 학생 본인의 "오늘" 체크리스트 배정·항목·진행률을 반환한다.
 * 관리자용 /api/admin/students/[id]/today와 로직은 동일하되, 대상 학생을
 * URL 파라미터가 아니라 세션에서 가져오므로 다른 학생 데이터에 접근할 수 없다.
 */
export async function GET(req: NextRequest) {
  const student = await getStudentFromRequest(req);
  if (!student) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const todayStr = getAcademyToday();

  // 오늘자 배정이 아직 없으면 고정 배정(개별 우선, 없으면 반 템플릿) 기준으로 자동 생성한다.
  await ensureTodayAssignment(student.studentId);

  const studentRow = await prisma.student.findUnique({
    where: { studentId: student.studentId },
    include: { currentClass: true },
  });

  const assignments = await prisma.checklistAssignment.findMany({
    where: {
      studentId: student.studentId,
      checklistDate: new Date(`${todayStr}T00:00:00.000Z`),
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  const allItems = assignments.flatMap((a) => a.items);
  const progressItems = allItems.filter((i) => i.isProgressItem);
  const completedCount = progressItems.filter((i) => i.completed).length;
  const progress =
    progressItems.length === 0 ? 0 : Math.round((completedCount / progressItems.length) * 100);

  // 오늘 점수형 항목들의 합산 점수 (예: 획득한 점수 98/100)
  const scoredItems = allItems.filter((i) => i.hasScore && i.maxScore != null);
  const earnedScore = scoredItems.reduce((sum, i) => sum + (i.score ?? 0), 0);
  const maxScore = scoredItems.reduce((sum, i) => sum + (i.maxScore ?? 0), 0);

  const streak = await computeStreak(student.studentId);

  const videoIds = Array.from(
    new Set(allItems.map((i) => i.teachingVideoId).filter(function (v): v is string { return !!v; }))
  );
  const videos = videoIds.length
    ? await prisma.teachingVideo.findMany({
        where: { videoId: { in: videoIds } },
        include: { file: true },
      })
    : [];
  const videoMap: Record<string, { title: string; url: string }> = {};
  for (const v of videos) {
    videoMap[v.videoId] = { title: v.title, url: await getSignedDownloadUrl(v.file.storageKey, 600) };
  }

  const assignmentsOut = assignments.map((a) => ({
    ...a,
    items: a.items.map((item) => ({
      ...item,
      teachingVideo: item.teachingVideoId ? videoMap[item.teachingVideoId] || null : null,
    })),
  }));

  return NextResponse.json({
    studentName: studentRow?.name || student.name,
    className: studentRow?.currentClass ? studentRow.currentClass.name : null,
    date: todayStr,
    assignments: assignmentsOut,
    progress,
    streak,
    earnedScore,
    maxScore,
  });
}
