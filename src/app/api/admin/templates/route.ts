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

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const templates = await prisma.checklistTemplate.findMany({
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

type ItemInput = {
  title: string;
  hasCheck?: boolean;
  hasCount?: boolean;
  targetCount?: number;
  hasScore?: boolean;
  maxScore?: number;
  linkUrl?: string;
  linkLabel?: string;
  hasPhotoSubmission?: boolean;
  hasAudioSubmission?: boolean;
  hasVideoSubmission?: boolean;
  requiredFeatures?: string[];
};

/**
 * 템플릿 생성. 항목 하나에 체크/횟수/점수/링크/사진제출/음성제출/영상제출을
 * 자유롭게 조합할 수 있다(기능 플래그 구조).
 *
 * 이번 배치의 범위: 관리자 교사영상(teachingVideoId)은 아직 지원하지 않는다 —
 * 실제 영상 파일을 저장할 스토리지(R2) 연동이 아직 없어서, 영상 업로드가
 * 없는 상태로 teachingVideoId를 받아도 참조 무결성을 보장할 방법이 없기
 * 때문이다. 사진/음성/영상 "제출" 기능 플래그는 미리 받아 저장해두지만
 * (학생 화면에서 나중에 쓸 수 있도록), 실제 업로드·저장 파이프라인은
 * 다음 배치에서 R2 연동과 함께 추가한다 — 지금은 플래그만 켜질 뿐 실제
 * 제출은 아직 안 된다는 점을 관리자 화면에 명확히 표시해야 한다.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

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
      item.hasCheck || item.hasCount || item.hasScore || item.linkUrl ||
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
    const required = item.requiredFeatures ?? [];
    const invalid = required.filter((f) => !VALID_FEATURES.includes(f as any));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `"${item.title}" 항목: 알 수 없는 완료조건 기능(${invalid.join(", ")})` },
        { status: 400 }
      );
    }
  }

  const template = await prisma.checklistTemplate.create({
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
          hasPhotoSubmission: !!item.hasPhotoSubmission,
          hasAudioSubmission: !!item.hasAudioSubmission,
          hasVideoSubmission: !!item.hasVideoSubmission,
          requiredFeatures: item.requiredFeatures ?? [],
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(template, { status: 201 });
}
