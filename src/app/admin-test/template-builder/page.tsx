"use client";

import { useEffect, useState } from "react";
import { colors, fontFamily } from "../theme";

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
  materialDocUrl: string | null;
};

type TemplateItem = {
  templateItemId: string;
  activityId: string | null;
  title: string;
  hasCheck: boolean;
  hasCount: boolean;
  targetCount: number | null;
  hasScore: boolean;
  maxScore: number | null;
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
};

type Template = {
  templateId: string;
  name: string;
  items: TemplateItem[];
};

function activityTags(a: Activity) {
  return [
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
}

function itemTags(it: TemplateItem) {
  return [
    it.hasCheck && "☑",
    it.hasCount && `🔁${it.targetCount}회`,
    it.hasScore && `🏆/${it.maxScore}`,
    it.hasPhotoSubmission && "📷",
    it.hasVideoSubmission && "🎬",
    it.hasAudioSubmission && "🎤",
  ]
    .filter(Boolean)
    .join(" ");
}

const card: React.CSSProperties = {
  background: colors.card,
  borderRadius: 16,
  boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
};
const box: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 15,
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  fontFamily,
};
const primaryBtn: React.CSSProperties = {
  padding: "13px 18px",
  fontSize: 15,
  fontWeight: 700,
  color: "#fff",
  background: colors.blueGradient,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  color: colors.textSecondary,
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  cursor: "pointer",
};

export default function TemplateBuilderPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [activities, setActivities] = useState<Activity[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [mode, setMode] = useState<"list" | "edit">("list");
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function refresh() {
    const res = await fetch("/api/admin/templates");
    if (res.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setTemplates(await res.json());
    const aRes = await fetch("/api/admin/activities");
    if (aRes.ok) setActivities(await aRes.json());
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

  function startNew() {
    setEditingId("");
    setName("");
    setPickedIds([]);
    setMode("edit");
    setMsg("");
  }

  function startEdit(t: Template) {
    setEditingId(t.templateId);
    setName(t.name);
    setPickedIds(t.items.filter((it) => it.activityId).map((it) => it.activityId as string));
    setMode("edit");
    setMsg("");
  }

  function cancel() {
    setMode("list");
    setMsg("");
  }

  function addActivity(id: string) {
    setPickedIds((prev) => (prev.indexOf(id) === -1 ? [...prev, id] : prev));
  }

  function removeActivity(id: string) {
    setPickedIds((prev) => prev.filter((x) => x !== id));
  }

  async function handleSave() {
    if (!name.trim()) {
      setMsg("템플릿 이름을 입력하세요.");
      return;
    }
    if (pickedIds.length === 0) {
      setMsg("체크리스트에 담을 활동을 하나 이상 골라주세요.");
      return;
    }
    setSaving(true);
    setMsg("");
    const url = editingId ? "/api/admin/templates/" + editingId : "/api/admin/templates";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), activityIds: pickedIds }),
    });
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
    if (!confirm("이 템플릿을 삭제하시겠어요? (이미 배정된 학생 기록은 남아있습니다)")) return;
    const res = await fetch("/api/admin/templates/" + id, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await refresh();
      if (mode === "edit" && editingId === id) setMode("list");
    } else {
      alert("삭제 실패: " + data.error);
    }
  }

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto", padding: 16, fontFamily }}>
        <h1 style={{ fontSize: 20, marginBottom: 16, color: colors.navy }}>관리자 로그인</h1>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} style={box} />
          <input placeholder="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={box} />
          <button type="submit" style={primaryBtn}>
            로그인
          </button>
        </form>
        {loginMsg && <p style={{ color: colors.pink }}>{loginMsg}</p>}
      </div>
    );
  }

  if (mode === "edit") {
    const chosen = pickedIds.map((id) => activities.find((a) => a.activityId === id)).filter((a): a is Activity => !!a);
    const available = activities.filter((a) => pickedIds.indexOf(a.activityId) === -1);

    return (
      <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: colors.navy }}>{editingId ? "템플릿 수정" : "체크리스트 템플릿 생성"}</h1>

        <input
          placeholder="템플릿 이름 (예: 기본 체크리스트)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ ...box, marginBottom: 16 }}
        />

        {chosen.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {chosen.map((a) => (
              <div
                key={a.activityId}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: colors.blueLight, borderRadius: 10, padding: "10px 14px" }}
              >
                <span style={{ fontSize: 14, color: colors.navy, fontWeight: 600 }}>
                  {a.name} <span style={{ fontSize: 12, fontWeight: 400 }}>{activityTags(a)}</span>
                </span>
                <button type="button" onClick={() => removeActivity(a.activityId)} style={{ fontSize: 12, padding: "4px 10px", color: colors.blue, background: colors.card, border: "none", borderRadius: 8, cursor: "pointer" }}>
                  빼기
                </button>
              </div>
            ))}
          </div>
        )}

        {activities.length === 0 && (
          <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
            아직 생성된 활동이 없습니다. "활동 만들기" 화면에서 먼저 만들어주세요.
          </p>
        )}
        {activities.length > 0 && available.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: colors.navy }}>체크리스트 추가하기</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {available.map((a) => (
                <button
                  key={a.activityId}
                  onClick={() => addActivity(a.activityId)}
                  style={{ textAlign: "left", ...card, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                >
                  <span style={{ fontSize: 14, color: colors.navy }}>{a.name}</span>
                  <span style={{ fontSize: 12 }}>{activityTags(a)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {msg && <p style={{ fontSize: 13, color: colors.pink, marginBottom: 8 }}>{msg}</p>}

        <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, width: "100%", marginBottom: 8 }}>
          {saving ? "저장 중..." : "저장"}
        </button>
        <button onClick={cancel} style={{ ...secondaryBtn, width: "100%", marginBottom: 8 }}>
          취소
        </button>
        {editingId && (
          <button
            onClick={() => handleDelete(editingId)}
            style={{ width: "100%", padding: 12, fontSize: 14, fontWeight: 700, color: colors.pink, border: `1px solid ${colors.pink}`, borderRadius: 10, background: "none", cursor: "pointer" }}
          >
            템플릿 삭제
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: colors.navy }}>체크리스트 템플릿 생성</h1>
      {templates.length === 0 && <p style={{ color: colors.textSecondary }}>아직 생성된 템플릿이 없습니다.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {templates.map((t) => (
          <button key={t.templateId} onClick={() => startEdit(t)} style={{ textAlign: "left", ...card, padding: "12px 14px", cursor: "pointer" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>{t.name}</div>
            <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              {t.items.map((it) => it.title + " " + itemTags(it)).join(" · ")}
            </div>
          </button>
        ))}
      </div>
      <button onClick={startNew} style={{ ...primaryBtn, width: "100%" }}>
        + 체크리스트 추가하기
      </button>
    </div>
  );
}
