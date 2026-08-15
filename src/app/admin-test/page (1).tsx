"use client";

import { useEffect, useState } from "react";

type TeachingVideo = { videoId: string; title: string };

type Activity = {
  activityId: string;
  name: string;
  hasCheck: boolean;
  hasCount: boolean;
  targetCount: number | null;
  hasScore: boolean;
  maxScore: number | null;
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
  hasFileSubmission: boolean;
  materialLinkUrl: string | null;
  materialVideo: { videoId: string; title: string } | null;
  materialPhotoUrl: string | null;
  materialPhotoFilename: string | null;
  materialDocUrl: string | null;
  materialDocFilename: string | null;
};

type Draft = {
  name: string;
  hasCheck: boolean;
  hasCount: boolean;
  targetCount: string;
  hasScore: boolean;
  maxScore: string;
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
  hasFileSubmission: boolean;
  materialLinkUrl: string;
  materialVideoId: string;
  materialPhotoFile: File | null;
  materialDocFile: File | null;
  removeMaterialPhoto: boolean;
  removeMaterialDoc: boolean;
};

function emptyDraft(): Draft {
  return {
    name: "",
    hasCheck: true,
    hasCount: false,
    targetCount: "3",
    hasScore: false,
    maxScore: "100",
    hasPhotoSubmission: false,
    hasAudioSubmission: false,
    hasVideoSubmission: false,
    hasFileSubmission: false,
    materialLinkUrl: "",
    materialVideoId: "",
    materialPhotoFile: null,
    materialDocFile: null,
    removeMaterialPhoto: false,
    removeMaterialDoc: false,
  };
}

const SUBMIT_FEATURES: { key: keyof Draft; label: string }[] = [
  { key: "hasCheck", label: "☑ 체크완료 박스" },
  { key: "hasCount", label: "🔁 횟수" },
  { key: "hasScore", label: "🏆 시험 점수" },
  { key: "hasPhotoSubmission", label: "📷 사진 제출" },
  { key: "hasVideoSubmission", label: "🎬 영상 제출" },
  { key: "hasAudioSubmission", label: "🎤 음성 제출" },
  { key: "hasFileSubmission", label: "📄 파일 제출" },
];

export default function ActivitiesPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [activities, setActivities] = useState<Activity[]>([]);
  const [teachingVideos, setTeachingVideos] = useState<TeachingVideo[]>([]);
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function refresh() {
    const res = await fetch("/api/admin/activities");
    if (res.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setActivities(await res.json());
    const vRes = await fetch("/api/admin/teaching-videos");
    if (vRes.ok) {
      const vData = await vRes.json();
      setTeachingVideos(vData.map((v: { videoId: string; title: string }) => ({ videoId: v.videoId, title: v.title })));
    }
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

  function startAdd() {
    setDraft(emptyDraft());
    setMode("add");
    setMsg("");
  }

  function startEdit(a: Activity) {
    setEditingId(a.activityId);
    setDraft({
      name: a.name,
      hasCheck: a.hasCheck,
      hasCount: a.hasCount,
      targetCount: a.targetCount != null ? String(a.targetCount) : "3",
      hasScore: a.hasScore,
      maxScore: a.maxScore != null ? String(a.maxScore) : "100",
      hasPhotoSubmission: a.hasPhotoSubmission,
      hasAudioSubmission: a.hasAudioSubmission,
      hasVideoSubmission: a.hasVideoSubmission,
      hasFileSubmission: a.hasFileSubmission,
      materialLinkUrl: a.materialLinkUrl || "",
      materialVideoId: a.materialVideo ? a.materialVideo.videoId : "",
      materialPhotoFile: null,
      materialDocFile: null,
      removeMaterialPhoto: false,
      removeMaterialDoc: false,
    });
    setMode("edit");
    setMsg("");
  }

  function cancel() {
    setMode("list");
    setMsg("");
  }

  function toggleFeature(key: keyof Draft) {
    setDraft((d) => ({ ...d, [key]: !d[key] } as Draft));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setMsg("활동명을 입력하세요.");
      return;
    }
    const anySubmit =
      draft.hasCheck || draft.hasCount || draft.hasScore || draft.hasPhotoSubmission ||
      draft.hasAudioSubmission || draft.hasVideoSubmission || draft.hasFileSubmission;
    const anyMaterial = !!draft.materialLinkUrl.trim() || !!draft.materialVideoId || !!draft.materialPhotoFile || !!draft.materialDocFile;
    if (!anySubmit && !anyMaterial && mode === "add") {
      setMsg("최소 하나의 항목을 선택하세요.");
      return;
    }

    setSaving(true);
    setMsg("");

    const fd = new FormData();
    fd.append("name", draft.name.trim());
    fd.append("hasCheck", String(draft.hasCheck));
    fd.append("hasCount", String(draft.hasCount));
    if (draft.hasCount) fd.append("targetCount", draft.targetCount);
    fd.append("hasScore", String(draft.hasScore));
    if (draft.hasScore) fd.append("maxScore", draft.maxScore);
    fd.append("hasPhotoSubmission", String(draft.hasPhotoSubmission));
    fd.append("hasAudioSubmission", String(draft.hasAudioSubmission));
    fd.append("hasVideoSubmission", String(draft.hasVideoSubmission));
    fd.append("hasFileSubmission", String(draft.hasFileSubmission));
    fd.append("materialLinkUrl", draft.materialLinkUrl.trim());
    fd.append("materialVideoId", draft.materialVideoId);
    if (draft.materialPhotoFile) fd.append("materialPhotoFile", draft.materialPhotoFile);
    if (draft.materialDocFile) fd.append("materialDocFile", draft.materialDocFile);
    if (mode === "edit") {
      fd.append("removeMaterialPhoto", String(draft.removeMaterialPhoto));
      fd.append("removeMaterialDoc", String(draft.removeMaterialDoc));
    }

    const url = mode === "edit" ? "/api/admin/activities/" + editingId : "/api/admin/activities";
    const res = await fetch(url, { method: mode === "edit" ? "PUT" : "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await refresh();
      setMode("list");
    } else {
      setMsg("실패: " + data.error);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("이 활동을 삭제하시겠어요?")) return;
    const res = await fetch("/api/admin/activities/" + id, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await refresh();
      if (mode === "edit" && editingId === id) setMode("list");
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
          <input placeholder="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={box} />
          <button type="submit" style={{ padding: 12, fontSize: 16 }}>
            로그인
          </button>
        </form>
        {loginMsg && <p style={{ color: "crimson" }}>{loginMsg}</p>}
      </div>
    );
  }

  if (mode === "add" || mode === "edit") {
    const editingActivity = mode === "edit" ? activities.find((a) => a.activityId === editingId) : null;
    return (
      <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>{mode === "edit" ? "활동 수정" : "활동 추가"}</h1>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            placeholder="활동명 (예: 팝송부르기, 단어시험, 말하기)"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            style={box}
          />

          <div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>학생이 해야 할 것</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUBMIT_FEATURES.map((f) => (
                <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#f5f5f5", borderRadius: 8 }}>
                  <input type="checkbox" checked={!!draft[f.key]} onChange={() => toggleFeature(f.key)} />
                  <span style={{ fontSize: 14 }}>{f.label}</span>
                  {f.key === "hasCount" && draft.hasCount && (
                    <input
                      type="number"
                      min={1}
                      placeholder="목표 횟수"
                      value={draft.targetCount}
                      onChange={(e) => setDraft({ ...draft, targetCount: e.target.value })}
                      style={{ width: 90, marginLeft: "auto", padding: 6 }}
                    />
                  )}
                  {f.key === "hasScore" && draft.hasScore && (
                    <input
                      type="number"
                      min={10}
                      step={10}
                      placeholder="만점"
                      value={draft.maxScore}
                      onChange={(e) => setDraft({ ...draft, maxScore: e.target.value })}
                      style={{ width: 90, marginLeft: "auto", padding: 6 }}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>관리자가 학생에게 보여줄 자료</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#f0f0f0", borderRadius: 8, padding: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>참고 링크 URL</label>
                <input
                  placeholder="https://..."
                  value={draft.materialLinkUrl}
                  onChange={(e) => setDraft({ ...draft, materialLinkUrl: e.target.value })}
                  style={box}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>학습영상 (미리 올려둔 영상 중 선택)</label>
                <select
                  value={draft.materialVideoId}
                  onChange={(e) => setDraft({ ...draft, materialVideoId: e.target.value })}
                  style={box}
                >
                  <option value="">연결 안 함</option>
                  {teachingVideos.map((v) => (
                    <option key={v.videoId} value={v.videoId}>
                      {v.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>참고 사진</label>
                {mode === "edit" && editingActivity?.materialPhotoFilename && !draft.removeMaterialPhoto && (
                  <div style={{ fontSize: 13, marginBottom: 4 }}>
                    현재: {editingActivity.materialPhotoFilename}{" "}
                    <button type="button" onClick={() => setDraft({ ...draft, removeMaterialPhoto: true })} style={{ fontSize: 12, padding: "2px 6px" }}>
                      삭제
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDraft({ ...draft, materialPhotoFile: e.target.files?.[0] || null, removeMaterialPhoto: false })}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>참고 파일</label>
                {mode === "edit" && editingActivity?.materialDocFilename && !draft.removeMaterialDoc && (
                  <div style={{ fontSize: 13, marginBottom: 4 }}>
                    현재: {editingActivity.materialDocFilename}{" "}
                    <button type="button" onClick={() => setDraft({ ...draft, removeMaterialDoc: true })} style={{ fontSize: 12, padding: "2px 6px" }}>
                      삭제
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  onChange={(e) => setDraft({ ...draft, materialDocFile: e.target.files?.[0] || null, removeMaterialDoc: false })}
                />
              </div>
            </div>
          </div>

          {msg && <p style={{ fontSize: 13, color: "crimson" }}>{msg}</p>}

          <button type="submit" disabled={saving} style={{ padding: 14, fontSize: 16, background: "#222", color: "#fff", border: "none", borderRadius: 8 }}>
            {saving ? "저장 중..." : "저장"}
          </button>
          <button type="button" onClick={cancel} style={{ padding: 10, fontSize: 14 }}>
            취소
          </button>
          {mode === "edit" && (
            <button
              type="button"
              onClick={() => handleDelete(editingId)}
              style={{ padding: 10, fontSize: 14, color: "#c0392b", border: "1px solid #c0392b", borderRadius: 8, background: "none" }}
            >
              활동 삭제
            </button>
          )}
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>활동 만들기</h1>
      {activities.length === 0 && <p style={{ color: "#888" }}>아직 생성된 활동이 없습니다.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {activities.map((a) => {
          const tags = [
            a.hasCheck && "☑",
            a.hasCount && `🔁${a.targetCount}회`,
            a.hasScore && `🏆/${a.maxScore}`,
            a.hasPhotoSubmission && "📷",
            a.hasVideoSubmission && "🎬",
            a.hasAudioSubmission && "🎤",
            a.hasFileSubmission && "📄",
            a.materialLinkUrl && "🔗",
            a.materialVideo && "📺",
            a.materialPhotoUrl && "🖼️",
            a.materialDocUrl && "📎",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={a.activityId}
              onClick={() => startEdit(a)}
              style={{ textAlign: "left", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</span>
              <span style={{ fontSize: 13 }}>{tags}</span>
            </button>
          );
        })}
      </div>
      <button onClick={startAdd} style={{ width: "100%", padding: 12, fontSize: 15 }}>
        + 활동추가
      </button>
    </div>
  );
}
