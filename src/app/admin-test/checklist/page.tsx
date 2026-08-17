"use client";

import { useEffect, useState } from "react";

type Student = { studentId: string; name: string };
type Template = { templateId: string; name: string; items: { templateItemId: string }[] };

type AssignedItem = {
  assignedItemId: string;
  title: string;
  hasCheck: boolean;
  checked: boolean;
  hasCount: boolean;
  currentCount: number;
  targetCount: number | null;
  hasScore: boolean;
  score: number | null;
  maxScore: number | null;
  linkUrl: string | null;
  linkLabel: string | null;
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
  hasFileSubmission: boolean;
  completed: boolean;
  teachingVideo: { title: string; url: string } | null;
};
type Assignment = { assignmentId: string; items: AssignedItem[] };
type TodayData = { assignments: Assignment[]; progress: number };

function PhotoUploader(props: { assignedItemId: string; onDone: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [viewUrl, setViewUrl] = useState("");
  const [viewMimeType, setViewMimeType] = useState("");
  const [viewFilename, setViewFilename] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/photo", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      setMsg("업로드 완료");
      props.onDone();
    } else {
      setMsg("실패: " + data.error);
    }
    setUploading(false);
  }

  async function handleView() {
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/photo");
    if (res.ok) {
      const data = await res.json();
      setViewUrl(data.url);
      setViewMimeType(data.mimeType || "");
      setViewFilename(data.filename || "");
    } else {
      setMsg("아직 제출된 파일이 없습니다.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("업로드된 파일을 삭제하시겠어요?")) return;
    setUploading(true);
    setMsg("");
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/photo", {
      method: "DELETE",
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      setMsg("삭제 완료");
      setViewUrl("");
      setViewMimeType("");
      setViewFilename("");
      props.onDone();
    } else {
      setMsg("삭제 실패: " + data.error);
    }
    setUploading(false);
  }

  return (
    <div style={{ marginBottom: 6 }}>
      <input type="file" accept="image/*,application/pdf" onChange={handleFile} disabled={uploading} />
      <button type="button" onClick={handleView} style={{ marginLeft: 8, padding: "4px 10px" }}>
        파일 보기
      </button>
      <button type="button" onClick={handleDelete} disabled={uploading} style={{ marginLeft: 8, padding: "4px 10px", color: "#c0392b" }}>
        삭제
      </button>
      {msg && <span style={{ marginLeft: 8, fontSize: 13 }}>{msg}</span>}
      {viewUrl && viewMimeType === "application/pdf" && (
        <div style={{ marginTop: 6 }}>
          <iframe
            src={viewUrl}
            title={viewFilename || "제출 PDF"}
            style={{ width: "100%", height: 500, border: "1px solid #ddd", borderRadius: 8 }}
          />
          <div style={{ marginTop: 4 }}>
            <a href={viewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
              📄 {viewFilename || "새 창에서 크게 보기"}
            </a>
          </div>
        </div>
      )}
      {viewUrl && viewMimeType !== "application/pdf" && (
        <div style={{ marginTop: 6 }}>
          <img src={viewUrl} alt="제출 사진" style={{ maxWidth: "100%", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}

function AudioUploader(props: { assignedItemId: string; onDone: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const
