"use client";

import { useEffect, useState } from "react";

type TeachingVideo = { title: string; url: string };

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
  teachingVideo: TeachingVideo | null;
};
type Assignment = { assignmentId: string; items: AssignedItem[] };
type TodayData = {
  studentName: string;
  className: string | null;
  date: string;
  assignments: Assignment[];
  progress: number;
};

function scoreOptions(maxScore: number) {
  const opts: number[] = [];
  for (let v = 10; v <= maxScore; v += 10) opts.push(v);
  return opts;
}

function SubmissionUploader(props: {
  assignedItemId: string;
  kind: "photo" | "audio" | "video" | "file";
  accept: string;
  label: string;
  onDone: () => void;
}) {
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
    const res = await fetch(`/api/student/assigned-items/${props.assignedItemId}/${props.kind}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg("업로드 완료");
      props.onDone();
    } else {
      setMsg("실패: " + data.error);
    }
    setUploading(false);
  }

  async function handleView() {
    const res = await fetch(`/api/student/assigned-items/${props.assignedItemId}/${props.kind}`);
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
    if (!confirm("업로드된 파일을 삭제하시겠어요?")) return;
    setUploading(true);
    setMsg("");
    const res = await fetch(`/api/student/assigned-items/${props.assignedItemId}/${props.kind}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
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

  const isImage = viewMimeType.startsWith("image/");
  const isPdf = viewMimeType === "application/pdf";
  const isAudio = viewMimeType.startsWith("audio/");
  const isVideo = viewMimeType.startsWith("video/");

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 14px",
            fontSize: 14,
            border: "1px solid #ccc",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {uploading ? "업로드 중..." : props.label}
          <input type="file" accept={props.accept} onChange={handleFile} disabled={uploading} style={{ display: "none" }} />
        </label>
        <button type="button" onClick={handleView} style={{ padding: "8px 12px", fontSize: 13 }}>
          파일 보기
        </button>
        <button type="button" onClick={handleDelete} disabled={uploading} style={{ padding: "8px 12px", fontSize: 13, color: "#c0392b" }}>
          삭제
        </button>
      </div>
      {msg && <span style={{ fontSize: 13, color: "#666" }}>{msg}</span>}
      {viewUrl && isPdf && (
        <div style={{ marginTop: 6 }}>
          <iframe src={viewUrl} title={viewFilename || "제출 파일"} style={{ width: "100%", height: 400, border: "1px solid #ddd", borderRadius: 8 }} />
        </div>
      )}
      {viewUrl && isImage && (
        <div style={{ marginTop: 6 }}>
          <img src={viewUrl} alt="제출 사진" style={{ maxWidth: "100%", borderRadius: 8 }} />
        </div>
      )}
      {viewUrl && isAudio && (
        <div style={{ marginTop: 6 }}>
          <audio controls src={viewUrl} style={{ width: "100%" }} />
        </div>
      )}
      {viewUrl && isVideo && (
        <div style={{ marginTop: 6 }}>
          <video controls src={viewUrl} style={{ width: "100%", maxHeight: 320, borderRadius: 8 }} />
        </div>
      )}
      {viewUrl && !isPdf && !isImage && !isAudio && !isVideo && (
        <div style={{ marginTop: 6 }}>
          <a href={viewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
            📎 {viewFilename || "제출 파일 열기/다운로드"}
          </a>
        </div>
      )}
    </div>
  );
}

export default function StudentPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [checking, setChecking] = useState(true);

  const [data, setData] = useState<TodayData | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadToday() {
    const res = await fetch("/api/student/today");
    if (res.status === 401) {
      setLoggedIn(false);
      setChecking(false);
      return;
    }
    setLoggedIn(true);
    setChecking(false);
    setData(await res.json());
  }

  useEffect(() => {
    loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginMsg("로그인 중...");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });
    if (res.ok) {
      setLoginMsg("");
      setLoginId("");
      setPassword("");
      await loadToday();
    } else {
      const d = await res.json().catch(() => ({}));
      setLoginMsg(d.error || "로그인 실패");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setLoggedIn(false);
    setData(null);
  }

  async function patchItem(assignedItemId: string, patch: Record<string, unknown>) {
    setSavingId(assignedItemId);
    await fetch("/api/student/assigned-items/" + assignedItemId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await loadToday();
    setSavingId(null);
  }

  const box: React.CSSProperties = { padding: 12, fontSize: 16, width: "100%", boxSizing: "border-box" };

  if (checking) {
    return <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>불러오는 중...</div>;
  }

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 380, margin: "60px auto", padding: 16, fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 22, textAlign: "center", marginBottom: 24 }}>보스턴영어</h1>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} style={box} />
          <input
            placeholder="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={box}
          />
          <button type="submit" style={{ padding: 14, fontSize: 16, background: "#222", color: "#fff", border: "none", borderRadius: 8 }}>
            로그인
          </button>
        </form>
        {loginMsg && <p style={{ color: "crimson", textAlign: "center", marginTop: 8 }}>{loginMsg}</p>}
        <p style={{ fontSize: 13, color: "#888", textAlign: "center", marginTop: 16 }}>
          아이디/비밀번호를 모르면 선생님께 문의하세요
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>{data?.studentName}</h1>
        <button onClick={handleLogout} style={{ fontSize: 12, padding: "6px 10px" }}>
          로그아웃
        </button>
      </div>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
        {data?.className ? data.className + " · " : ""}오늘의 체크리스트
      </p>

      {!data || data.assignments.length === 0 ? (
        <p style={{ color: "#888" }}>아직 배정된 체크리스트가 없습니다. 선생님께 문의하세요.</p>
      ) : (
        <>
          <div style={{ background: "#eee", borderRadius: 8, overflow: "hidden", height: 20, marginBottom: 8 }}>
            <div style={{ width: `${data.progress}%`, background: "#4caf50", height: "100%" }} />
          </div>
          <p style={{ fontSize: 14, marginBottom: 20 }}>오늘 진행률 {data.progress}%</p>

          {data.assignments.map((a) =>
            a.items.map((item) => (
              <div
                key={item.assignedItemId}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 10,
                  background: item.completed ? "#f3fbf3" : "white",
                  opacity: savingId === item.assignedItemId ? 0.6 : 1,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
                  {item.completed ? "✅ " : "⬜ "}
                  {item.title}
                </div>

                {item.hasCheck && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 15 }}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => patchItem(item.assignedItemId, { checked: e.target.checked })}
                      style={{ width: 20, height: 20 }}
                    />
                    체크 완료
                  </label>
                )}

                {item.hasCount && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <button
                      onClick={() => patchItem(item.assignedItemId, { currentCount: Math.max(0, item.currentCount - 1) })}
                      disabled={item.currentCount <= 0}
                      style={{ padding: "6px 14px", fontSize: 16 }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: 15 }}>
                      {item.currentCount} / {item.targetCount}회
                    </span>
                    <button
                      onClick={() => patchItem(item.assignedItemId, { currentCount: item.currentCount + 1 })}
                      style={{ padding: "6px 14px", fontSize: 16 }}
                    >
                      +
                    </button>
                  </div>
                )}

                {item.hasScore && item.maxScore && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <select
                      value={item.score ?? ""}
                      onChange={(e) =>
                        patchItem(item.assignedItemId, { score: e.target.value === "" ? null : Number(e.target.value) })
                      }
                      style={{ padding: 8, fontSize: 15 }}
                    >
                      <option value="">점수 선택</option>
                      {scoreOptions(item.maxScore).map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: 15 }}>/ {item.maxScore}점</span>
                  </div>
                )}

                {item.linkUrl && (
                  <a href={item.linkUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginBottom: 8, fontSize: 14 }}>
                    🔗 {item.linkLabel || "자료 열기"}
                  </a>
                )}

                {item.teachingVideo && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>🎓 {item.teachingVideo.title}</div>
                    <video controls src={item.teachingVideo.url} style={{ width: "100%", maxHeight: 320, borderRadius: 8 }} />
                  </div>
                )}

                {item.hasPhotoSubmission && (
                  <SubmissionUploader
                    assignedItemId={item.assignedItemId}
                    kind="photo"
                    accept="image/*,application/pdf"
                    label="📷 사진 올리기"
                    onDone={loadToday}
                  />
                )}
                {item.hasAudioSubmission && (
                  <SubmissionUploader
                    assignedItemId={item.assignedItemId}
                    kind="audio"
                    accept="audio/*"
                    label="🎤 음성 올리기"
                    onDone={loadToday}
                  />
                )}
                {item.hasVideoSubmission && (
                  <SubmissionUploader
                    assignedItemId={item.assignedItemId}
                    kind="video"
                    accept="video/*"
                    label="🎬 영상 올리기"
                    onDone={loadToday}
                  />
                )}
                {item.hasFileSubmission && (
                  <SubmissionUploader
                    assignedItemId={item.assignedItemId}
                    kind="file"
                    accept="*/*"
                    label="📎 파일 올리기"
                    onDone={loadToday}
                  />
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
