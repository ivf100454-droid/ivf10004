import { prisma } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage";

/** 학생에게 보여줄 활동 자료 (관리자가 활동 만들기에서 넣어둔 것). */
export type ActivityMaterials = {
  activityName: string;
  linkUrl: string | null;
  video: { title: string; url: string } | null;
  photo: { name: string; url: string; mimeType: string } | null;
  doc: { name: string; url: string; mimeType: string } | null;
};

type ItemRef = {
  assignedItemId: string;
  activityId: string | null;
  title: string;
  sourceTemplateId: string | null;
};

const URL_TTL_SECONDS = 3600;

/**
 * 배정된 항목들에 대해, 연결된 활동의 "현재" 자료를 찾아 돌려준다.
 * 배정 후에 활동 자료를 바꿔도 학생 화면에 바로 반영되게 하려고, 배정 시점 복사본이 아니라
 * 활동을 매번 다시 읽는다.
 *
 * 예전 항목(activityId 없음)은 원본 템플릿에서 같은 제목의 항목을 찾아 활동을 알아낸다.
 * 찾은 연결은 DB에도 저장해 다음부터는 바로 찾는다.
 * 반환: assignedItemId → 자료 (자료가 하나도 없으면 null)
 */
export async function resolveActivityMaterials(
  items: ItemRef[]
): Promise<Record<string, ActivityMaterials | null>> {
  const activityIdByItem: Record<string, string | null> = {};
  const missing = items.filter((i) => !i.activityId);

  if (missing.length > 0) {
    const templateIds = Array.from(
      new Set(missing.map((i) => i.sourceTemplateId).filter((v): v is string => !!v))
    );
    const templateItems = templateIds.length
      ? await prisma.templateItem.findMany({
          where: { templateId: { in: templateIds }, activityId: { not: null } },
          select: { templateId: true, title: true, activityId: true },
        })
      : [];
    const byTemplateTitle: Record<string, string> = {};
    for (const ti of templateItems) {
      if (ti.activityId) byTemplateTitle[ti.templateId + "::" + ti.title] = ti.activityId;
    }

    const toSave: { assignedItemId: string; activityId: string }[] = [];
    for (const i of missing) {
      const found = i.sourceTemplateId ? byTemplateTitle[i.sourceTemplateId + "::" + i.title] : undefined;
      activityIdByItem[i.assignedItemId] = found || null;
      if (found) toSave.push({ assignedItemId: i.assignedItemId, activityId: found });
    }
    // 찾은 연결은 저장 (실패해도 화면 표시에는 영향 없음)
    for (const s of toSave) {
      try {
        await prisma.assignedChecklistItem.update({
          where: { assignedItemId: s.assignedItemId },
          data: { activityId: s.activityId },
        });
      } catch {
        /* 무시 */
      }
    }
  }
  for (const i of items) {
    if (i.activityId) activityIdByItem[i.assignedItemId] = i.activityId;
  }

  const activityIds = Array.from(
    new Set(Object.values(activityIdByItem).filter((v): v is string => !!v))
  );
  const activities = activityIds.length
    ? await prisma.activity.findMany({
        where: { activityId: { in: activityIds } },
        include: {
          materialVideo: { include: { file: true } },
          materialPhotoFile: true,
          materialDocFile: true,
        },
      })
    : [];

  const materialsByActivity: Record<string, ActivityMaterials | null> = {};
  for (const a of activities) {
    const m: ActivityMaterials = {
      activityName: a.name,
      linkUrl: a.materialLinkUrl || null,
      video: a.materialVideo
        ? {
            title: a.materialVideo.title,
            url: await getSignedDownloadUrl(a.materialVideo.file.storageKey, URL_TTL_SECONDS),
          }
        : null,
      photo: a.materialPhotoFile
        ? {
            name: a.materialPhotoFile.originalFilename,
            url: await getSignedDownloadUrl(a.materialPhotoFile.storageKey, URL_TTL_SECONDS),
            mimeType: a.materialPhotoFile.mimeType,
          }
        : null,
      doc: a.materialDocFile
        ? {
            name: a.materialDocFile.originalFilename,
            url: await getSignedDownloadUrl(a.materialDocFile.storageKey, URL_TTL_SECONDS),
            mimeType: a.materialDocFile.mimeType,
          }
        : null,
    };
    const hasAny = m.linkUrl || m.video || m.photo || m.doc;
    materialsByActivity[a.activityId] = hasAny ? m : null;
  }

  const out: Record<string, ActivityMaterials | null> = {};
  for (const i of items) {
    const aid = activityIdByItem[i.assignedItemId];
    out[i.assignedItemId] = aid ? materialsByActivity[aid] || null : null;
  }
  return out;
}
