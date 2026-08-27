import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getAcademyToday } from "@/lib/timezone";
import { getSignedDownloadUrl } from "@/lib/storage";
import { ensureTodayAssignment } from "@/lib/checklistGeneration";

/**
 * 특정 학생의 "오늘" 체크리스트 배정·항목·진행률을 반환한다.
 * 32번 요구사항: 진행률 = 완료된 is_progress_item 수 / 전체 is_progress_item 수 × 100
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const todayStr = getAcademyToday();

  // 오늘자 배정이 아직 없으면 고정 배정(개별 우선, 없으면 반 템플릿) 기준으로 자동 생성한다.
  await ensureTodayAssignment(params.id);

  const assignments = await prisma.checklistAssignment.findMany({
    where: {
      studentId: params.id,
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

  return NextResponse.json({ date: todayStr, assignments: assignmentsOut, progress });
}
