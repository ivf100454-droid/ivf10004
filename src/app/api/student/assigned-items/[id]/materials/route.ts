import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentFromRequest } from "@/lib/studentAuth";
import { getSignedDownloadUrl } from "@/lib/storage";
import { resolveActivityMaterials } from "@/lib/activityMaterials";

/**
 * 학생 본인 체크리스트 항목 1개의 "자료열기" 내용을 돌려준다.
 * 활동의 현재 자료를 우선 쓰고, 활동이 연결되지 않은 예전 항목은 배정 때 복사된 링크·학습영상을 쓴다.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const student = await getStudentFromRequest(req);
  if (!student) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const item = await prisma.assignedChecklistItem.findUnique({
    where: { assignedItemId: params.id },
    include: { assignment: true, teachingVideo: { include: { file: true } } },
  });
  if (!item) return NextResponse.json({ error: "존재하지 않는 항목입니다." }, { status: 404 });
  if (item.assignment.studentId !== student.studentId) {
    return NextResponse.json({ error: "본인의 체크리스트만 볼 수 있습니다." }, { status: 403 });
  }

  const map = await resolveActivityMaterials([
    {
      assignedItemId: item.assignedItemId,
      activityId: item.activityId,
      title: item.title,
      sourceTemplateId: item.assignment.sourceTemplateId,
    },
  ]);
  let materials = map[item.assignedItemId] || null;

  if (!materials && (item.linkUrl || item.teachingVideo)) {
    materials = {
      activityName: item.title,
      linkUrl: item.linkUrl,
      video: item.teachingVideo
        ? { title: item.teachingVideo.title, url: await getSignedDownloadUrl(item.teachingVideo.file.storageKey, 3600) }
        : null,
      photo: null,
      doc: null,
    };
  }

  return NextResponse.json({ title: item.title, materials });
}
