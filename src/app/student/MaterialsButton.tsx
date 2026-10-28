"use client";

import Link from "next/link";
import { colors } from "./theme";

export type ItemMaterials = {
  activityName: string;
  linkUrl: string | null;
  video: { title: string; url: string } | null;
  photo: { name: string; url: string; mimeType: string } | null;
  doc: { name: string; url: string; mimeType: string } | null;
};

/** 체크리스트 카드 아래에 붙는 "📂 자료열기" 버튼. 자료가 없으면 아무것도 그리지 않는다. */
export default function MaterialsButton(props: { assignedItemId: string; materials?: ItemMaterials | null }) {
  const m = props.materials;
  if (!m) return null;
  const icons = [m.video && "🎬 영상", m.photo && "🖼️ 사진", m.doc && "📎 파일", m.linkUrl && "🔗 링크"]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/student/materials/${props.assignedItemId}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        margin: "0 16px 14px",
        padding: "10px 14px",
        borderRadius: 12,
        background: colors.blueLight,
        color: colors.blue,
        fontSize: 13,
        fontWeight: 700,
        textDecoration: "none",
      }}
    >
      <span>📂 자료열기</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>{icons} ›</span>
    </Link>
  );
}
