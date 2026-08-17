import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const existing = await prisma.checklistTemplate.findUnique({ where: { templateId: params.id } });
  if (!existing) return NextResponse.json({ error: "존재하지 않는 템플릿입니다." }, { status: 404 });

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

  const updated = await prisma.$transaction(async (tx) => {
    await tx.templateItem.deleteMany({ where: { templateId: params.id } });
    return tx.checklistTemplate.update({
      where: { templateId: params.id },
      data: {
        name: name,
        items: {
          create: activityIds.map((activityId, i) => {
            const a = byId.get(activityId)!;
            const required: string[] = [];
            if (a.hasCheck) required.push("check");
            if (a.hasCount) required.push("count");
            if (a.hasScore) required.push("score");
            if (a.hasPhotoSubmission) required.push("photoSubmission");
            if (a.hasAudioSubmission) required.push("audioSubmission");
            if (a.hasVideoSubmission) required.push("videoSubmission");
            if (a.hasFileSubmission) required.push("fileSubmission");

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
              hasPhotoSubmission: a.hasPhotoSubmission,
              hasAudioSubmission: a.hasAudioSubmission,
              hasVideoSubmission: a.hasVideoSubmission,
              hasFileSubmission: a.hasFileSubmission,
              requiredFeatures: required,
            };
          }),
        },
      },
      include: { items: true },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const existing = await prisma.checklistTemplate.findUnique({ where: { templateId: params.id } });
  if (!existing) return NextResponse.json({ error: "존재하지 않는 템플릿입니다." }, { status: 404 });

  await prisma.checklistTemplate.delete({ where: { templateId: params.id } });

  return NextResponse.json({ ok: true });
}
