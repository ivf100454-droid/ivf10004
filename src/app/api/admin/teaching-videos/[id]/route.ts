import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const video = await prisma.teachingVideo.findUnique({ where: { videoId: params.id } });
  if (!video) return NextResponse.json({ error: "존재하지 않는 영상입니다." }, { status: 404 });

  const inUse = await prisma.templateItem.findFirst({ where: { teachingVideoId: params.id } });
  if (inUse) {
    return NextResponse.json(
      { error: "이 영상은 템플릿 항목에서 사용 중이라 삭제할 수 없습니다. 먼저 해당 템플릿에서 연결을 해제해주세요." },
      { status: 409 }
    );
  }

  await prisma.teachingVideo.delete({ where: { videoId: params.id } });

  return NextResponse.json({ ok: true });
}
