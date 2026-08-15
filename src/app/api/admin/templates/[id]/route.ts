import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

const VALID_FEATURES = [
  "check",
  "count",
  "score",
  "photoSubmission",
  "audioSubmission",
  "videoSubmission",
] as const;

type ItemInput = {
  title: string;
  hasCheck?: boolean;
  hasCount?: boolean;
  targetCount?: number;
  hasScore?: boolean;
  maxScore?: number;
  linkUrl?: string;
  linkLabel?: string;
  teachingVideoId?: string;
  hasPhotoSubmission?: boolean;
  hasAudioSubmission?: boolean;
  hasVideoSubmission?: boolean;
  requiredFeatures?: string[];
};

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const existing = await prisma.checklistTemplate.findUnique({ where: { templateId: params.id } });
  if (!existing) return NextResponse.json({ error: "존재하지 않는 템플릿입니다." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !Array.isArray(body?.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "템플릿 이름과 항목 목록(items)이 필요합니다." },
      { status: 400 }
    );
  }

  const items: ItemInput[] = body.items;

  for (const [i, item] of items.entries()) {
    if (!item.title?.trim()) {
      return NextResponse.json({ error: `${i + 1}번째 항목에 제목이 없습니다.` }, { status: 400 });
    }
    const anyFeature =
      item.hasCheck || item.hasCount || item.hasScore || item.linkUrl || item.teachingVideoId ||
      item.hasPhotoSubmission || item.hasAudioSubmission || item.hasVideoSubmission;
    if (!anyFeature) {
      return NextResponse.json(
        { error: `"${item.title}" 항목에 최소 하나의 기능을 선택해야 합니다.` },
        { status: 400 }
      );
    }
    if (item.hasCount && (!item.targetCount || item.targetCount < 1)) {
      return NextResponse.json(
        { error: `"${item.title}" 항목: 횟수형은 목표 횟수(1 이상)가 필요합니다.` },
        { status: 400 }
      );
    }
    if (item.hasScore && (!item.maxScore || item.maxScore < 1)) {
      return NextResponse.json(
        { error: `"${item.title}" 항목: 점수형은 만점(1 이상)이 필요합니다.` },
        { status: 400 }
      );
    }
    if (item.teachingVideoId) {
      const video = await prisma.teachingVideo.findUnique({ where: { videoId: item.teachingVideoId } });
      if (!video) {
        return NextResponse.json(
          { error: `"${item.title}" 항목: 존재하지 않는 학습영상입니다.` },
          { status: 400 }
        );
      }
    }
    const required = item.requiredFeatures ?? [];
    const invalid = required.filter((f) => !VALID_FEATURES.includes(f as any));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `"${item.title}" 항목: 알 수 없는 완료조건 기능(${invalid.join(", ")})` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.templateItem.deleteMany({ where: { templateId: params.id } });
    return tx.checklistTemplate.update({
      where: { templateId: params.id },
      data: {
        name: body.name,
        items: {
          create: items.map((item, i) => ({
            title: item.title.trim(),
            sortOrder: i,
            hasCheck: !!item.hasCheck,
            hasCount: !!item.hasCount,
            targetCount: item.hasCount ? item.targetCount : null,
            hasScore: !!item.hasScore,
            maxScore: item.hasScore ? item.maxScore : null,
            linkUrl: item.linkUrl?.trim() || null,
            linkLabel: item.linkLabel?.trim() || null,
            teachingVideoId: item.teachingVideoId || null,
            hasPhotoSubmission: !!item.hasPhotoSubmission,
            hasAudioSubmission: !!item.hasAudioSubmission,
            hasVideoSubmission: !!item.hasVideoSubmission,
            requiredFeatures: item.requiredFeatures ?? [],
          })),
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
