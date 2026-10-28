"use client";

import { colors } from "./theme";
import type { ItemMaterials } from "./MaterialsButton";

const card = {
  background: colors.card,
  borderRadius: 20,
  padding: 16,
  marginBottom: 14,
  boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
} as const;

const label = { fontSize: 13, fontWeight: 700, color: colors.textSecondary, marginBottom: 10 } as const;

const openButton = {
  display: "block",
  textAlign: "center" as const,
  padding: 12,
  borderRadius: 12,
  background: colors.blueLight,
  color: colors.blue,
  fontWeight: 700,
  fontSize: 14,
  textDecoration: "none",
  marginTop: 10,
};

/** 선생님이 활동에 넣어둔 자료(영상·사진·파일·링크)를 학생에게 보여준다. */
export default function MaterialsView(props: { materials?: ItemMaterials | null }) {
  const m = props.materials;
  if (!m) return null;
  const photoIsPdf = m.photo?.mimeType === "application/pdf";
  const docIsPdf = m.doc?.mimeType === "application/pdf";
  const docIsImage = !!m.doc?.mimeType.startsWith("image/");

  return (
    <div>
      {m.video && (
        <div style={card}>
          <div style={label}>🎬 학습영상 · {m.video.title}</div>
          <video controls playsInline preload="metadata" src={m.video.url} style={{ width: "100%", borderRadius: 12, maxHeight: 320, background: "#000" }} />
        </div>
      )}

      {m.photo && (
        <div style={card}>
          <div style={label}>🖼️ 참고사진</div>
          {photoIsPdf ? (
            <iframe src={m.photo.url} title={m.photo.name} style={{ width: "100%", height: 420, border: "none", borderRadius: 12 }} />
          ) : (
            <a href={m.photo.url} target="_blank" rel="noreferrer">
              <img src={m.photo.url} alt={m.photo.name} style={{ width: "100%", borderRadius: 12, display: "block" }} />
            </a>
          )}
          <a href={m.photo.url} target="_blank" rel="noreferrer" style={openButton}>
            크게 보기
          </a>
        </div>
      )}

      {m.doc && (
        <div style={card}>
          <div style={label}>📎 참고파일 · {m.doc.name}</div>
          {docIsPdf && (
            <iframe src={m.doc.url} title={m.doc.name} style={{ width: "100%", height: 420, border: "none", borderRadius: 12 }} />
          )}
          {docIsImage && <img src={m.doc.url} alt={m.doc.name} style={{ width: "100%", borderRadius: 12, display: "block" }} />}
          <a href={m.doc.url} target="_blank" rel="noreferrer" style={openButton}>
            파일 열기
          </a>
        </div>
      )}

      {m.linkUrl && (
        <div style={card}>
          <div style={label}>🔗 참고링크</div>
          <div style={{ fontSize: 12, color: colors.textMuted, wordBreak: "break-all" }}>{m.linkUrl}</div>
          <a href={m.linkUrl} target="_blank" rel="noreferrer" style={openButton}>
            링크 열기
          </a>
        </div>
      )}
    </div>
  );
}
