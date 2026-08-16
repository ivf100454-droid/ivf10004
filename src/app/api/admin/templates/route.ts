import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const templates = await prisma.checklistTemplate.findMany({
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

/**
 * 템플릿 생성 — 활동 라이브러리에서 고른 활동들(activityIds)을 순서대로 담아
 * 템플릿 항목으로 복사한다. 항목 하나하나를 직접 입력하던 예전 방식은
 * templates/[id]/route.ts와의 하위 호환을 위해 스키마상으로는 남아있지만,
 * 이 엔드포인트는 activityIds 방식만 받는다.
 *
 * 참고: Activity.hasFileSubmission(파일 제출)은 TemplateItem에 별도 필드가
 * 없어 hasPhotoSubmission 칸에 합쳐서 저장한다(사진 제출 칸이 PDF도 이미
 * 받을 수 있음). 완전히 분리된 "파일 제출" 칸은 다음 배치 과제로 남긴다.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const activityIds: string[] = Array.isArray(body?.activityIds) ? body.activityIds : [];

  if (!name) return NextResponse.json({ error: "템플릿 이름을 입력하세요." }, { status: 400 });
  if (activityIds.length === 0) {
    return NextResponse.json({ error: "체크리스트에 담을 활동을 하나 이상 골라주세요." }, { status: 400 });
  }

  const activities = await prisma.activity.findMany({ where: { activityId: { in: activityIds } } });
  if (activities.length !== activityIds.length) {
    return NextResponse.json({ error: "존재하지 않는 활동이 포함되어 있습니다." }, { status: 400 });
  }
  const byId = new Map(activities.map((a) => [a.activityId, a]));

  const template = await prisma.checklistTemplate.create({
    data: {
      name: name,
      items: {
        create: activityIds.map((activityId, i) => {
          const a = byId.get(activityId)!;
          const required: string[] = [];
          if (a.hasCheck) required.push("check");
          if (a.hasCount) required.push("count");
          if (a.hasScore) required.push("score");
          if (a.hasPhotoSubmission || a.hasFileSubmission) required.push("photoSubmission");
          if (a.hasAudioSubmission) required.push("audioSubmission");
          if (a.hasVideoSubmission) required.push("videoSubmission");

          return {
            activityId: a.activityId,
            title: a.name,
            sortOrder: i,
            hasCheck: a.hasCheck,
            hasCount: a.hasCount,
            targetCount: a.targetCount,
            hasScore: a.hasScore,
            maxScore: a.maxScore,
            linkUrl: a.materialLinkUrl,
            teachingVideoId: a.materialVideoId,
            hasPhotoSubmission: a.hasPhotoSubmission || a.hasFileSubmission,
            hasAudioSubmission: a.hasAudioSubmission,
            hasVideoSubmission: a.hasVideoSubmission,
            requiredFeatures: required,
          };
        }),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(template, { status: 201 });
}
