"use client";

import { useEffect, useState } from "react";

type TeachingVideo = {
  videoId: string;
  title: string;
  description: string | null;
  createdAt: string;
  filename: string;
  sizeBytes: number;
  url: string;
};

export default function TeachingVideosPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [videos, setVideos] = useState<TeachingVideo[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [playingId, setPlayingId] = useState("");

  async function refresh() {
    const res = await fetch("/api/admin/teaching-videos");
    if (res.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setVideos(await res.json());
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginMsg("로그인 중...");
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });
    if (res.ok) {
      setLoginMsg("");
      await refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setLoginMsg(data.error || "로그인 실패");
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setUploadMsg("영상 파일을 선택해주세요.");
      return;
    }
    if (!title.trim()) {
      setUploadMsg("영상 제목을 입력해주세요.");
      return;
    }
    setUploading(true);
    setUploadMsg("업로드 중... (영상 용량에 따라 시간이 걸릴 수 있어요)");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    if (description.trim()) formData.append("description", description.trim());

    const res = await fetch("/api/admin/teaching-videos", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      setUploadMsg("업로드 완료: " + data.title);
      setTitle("");
      setDescription("");
      setFile(null);
      await refresh();
    } else {
      setUploadMsg("실패: " + data.error);
    }
    setUploading(false);
  }

  async function handleDelete(videoId: string) {
    if (!window.confirm("이 영상을 삭제하시겠어요?")) return;
    const res = await fetch("/api/admin/teaching-videos/" + videoId, { method: "DELETE" });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      await refresh();
    } else {
      alert("삭제 실패: " + data.error);
    }
  }

  const box: React.CSSProperties = { padding: 10, fontSize: 15, width: "100%", boxSizing: "border-box" };

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto", padding: 16, fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>관리자 로그인</h1>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} style={box} />
          <input
            placeholder="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={box}
          />
          <button type="submit" style={{ padding: 12, fontSize: 16 }}>
            로그인
          </button>
        </form>
        {loginMsg && <p style={{ color: "crimson" }}>{loginMsg}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>학습영상 라이브러리</h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
        여기 올린 영상은 "체크리스트 템플릿 만들기" 화면에서 항목에 연결해 학생에게 보여줄 수 있어요.
      </p>

      <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        <input
          placeholder="영상 제목 (예: 파닉스 3주차 노래)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={box}
        />
        <input
          placeholder="설명 (선택)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={box}
        />
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
        />
        <button type="submit" disabled={uploading} style={{ padding: 12, fontSize: 16 }}>
          {uploading ? "업로드 중..." : "영상 업로드"}
        </button>
        {uploadMsg && <p style={{ fontSize: 13 }}>{uploadMsg}</p>}
      </form>

      <h2 style={{ fontSize: 16, marginBottom: 8 }}>업로드된 영상 ({videos.length}개)</h2>
      {videos.length === 0 && <p style={{ color: "#888" }}>아직 업로드된 영상이 없습니다.</p>}
      {videos.map(function (v) {
        return (
          <div
            key={v.videoId}
            style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 10 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 15 }}>{v.title}</strong>
              <button
                type="button"
                onClick={() => handleDelete(v.videoId)}
                style={{ fontSize: 12, padding: "3px 8px", color: "#c0392b", background: "none", border: "1px solid #c0392b", borderRadius: 4 }}
              >
                삭제
              </button>
            </div>
            {v.description && <p style={{ fontSize: 13, color: "#666", margin: "4px 0" }}>{v.description}</p>}
            <p style={{ fontSize: 12, color: "#aaa", margin: "4px 0" }}>
              {v.filename} · {(v.sizeBytes / 1024 / 1024).toFixed(1)}MB
            </p>
            {playingId === v.videoId ? (
              <video controls src={v.url} style={{ width: "100%", maxHeight: 400, borderRadius: 8, marginTop: 6 }} />
            ) : (
              <button type="button" onClick={() => setPlayingId(v.videoId)} style={{ padding: "4px 10px", fontSize: 13 }}>
                재생
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
