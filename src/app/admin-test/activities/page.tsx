"use client";

import { useEffect, useRef, useState } from "react";
import { colors, fontFamily } from "../theme";

type TeachingVideo = { videoId: string; title: string };

type Area = { areaId: string; name: string };

type Activity = {
  activityId: string;
  name: string;
  areaId: string | null;
  hasCheck: boolean;
  hasCount: boolean;
  targetCount: number | null;
  hasScore: boolean;
  maxScore: number | null;
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
  hasFileSubmission: boolean;
  hasQrScan: boolean;
  materialLinkUrl: string | null;
  materialVideo: { videoId: string; title: string } | null;
  materialPhotoUrl: string | null;
  materialPhotoFilename: string | null;
  materialDocUrl: string | null;
  materialDocFilename: string | null;
};

type Draft = {
  name: string;
  areaId: string;
  hasCheck: boolean;
  hasCount: boolean;
  targetCount: string;
  hasScore: boolean;
  maxScore: string;
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
  hasFileSubmission: boolean;
  hasQrScan: boolean;
  materialLinkUrl: string;
  materialVideoId: string;
  materialPhotoFile: File | null;
  materialDocFile: File | null;
  removeMaterialPhoto: boolean;
  removeMaterialDoc: boolean;
};

function emptyDraft(areaId = ""): Draft {
  return {
    name: "",
    areaId,
    hasCheck: true,
    hasCount: false,
    targetCount: "3",
    hasScore: false,
    maxScore: "100",
    hasPhotoSubmission: false,
    hasAudioSubmission: false,
    hasVideoSubmission: false,
    hasFileSubmission: false,
    hasQrScan: false,
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
  { key: "hasPhotoSubmission", label: "📷 사진제출 및 QR읽기" },
  { key: "hasVideoSubmission", label: "🎬 영상 제출" },
  { key: "hasAudioSubmission", label: "🎤 음성 제출" },
  { key: "hasFileSubmission", label: "📄 파일 제출" },
];

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

/** 목록 드래그 순서 바꾸기 (폰 터치·PC 마우스 공용: Pointer Events). 활동 영역 목록과 세부활동 목록에서 같이 쓴다. */
function useDragReorder(opts: {
  getIds: () => string[];
  apply: (ids: string[]) => void;
  save: (ids: string[]) => Promise<boolean>;
  onFail: () => void;
}) {
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const [dragId, setDragId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const before = useRef("");

  function rowRef(id: string) {
    return (el: HTMLDivElement | null) => {
      if (el) rowRefs.current.set(id, el);
      else rowRefs.current.delete(id);
    };
  }

  function onMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (!dragId) return;
    const y = e.clientY;
    // 화면 위/아래 가장자리 근처에서는 자동 스크롤
    if (y < 70) window.scrollBy(0, -12);
    else if (y > window.innerHeight - 70) window.scrollBy(0, 12);
    const ids = optsRef.current.getIds();
    if (!ids.includes(dragId)) return;
    // 끌고 있는 항목을 뺀 나머지 중, 손가락보다 아래에 중심이 있는 첫 항목 앞에 끼워 넣는다
    const others = ids.filter((x) => x !== dragId);
    let to = others.findIndex((x) => {
      const el = rowRefs.current.get(x);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    if (to < 0) to = others.length;
    const next = others.slice();
    next.splice(to, 0, dragId);
    if (next.every((x, i) => x === ids[i])) return;
    optsRef.current.apply(next);
  }

  async function onUp() {
    if (!dragId) return;
    setDragId(null);
    const ids = optsRef.current.getIds();
    if (ids.join(",") === before.current) return;
    setMsg("순서 저장 중...");
    if (await optsRef.current.save(ids)) {
      setMsg("순서가 저장되었어요");
      setTimeout(() => setMsg(""), 1500);
    } else {
      setMsg("순서 저장에 실패했어요. 다시 시도해주세요.");
      optsRef.current.onFail();
    }
  }

  function handleProps(id: string) {
    return {
      onPointerDown: (e: React.PointerEvent<HTMLSpanElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        before.current = optsRef.current.getIds().join(",");
        setDragId(id);
      },
      onPointerMove: onMove,
      onPointerUp: onUp,
      onPointerCancel: onUp,
    };
  }

  return { dragId, msg, rowRef, handleProps };
}

/** ⠿ 손잡이가 달린 목록 한 줄. children은 줄을 눌렀을 때 동작하는 버튼. */
function DragRow(props: {
  id: string;
  drag: ReturnType<typeof useDragReorder>;
  draggable: boolean;
  children: React.ReactNode;
}) {
  const isDragging = props.drag.dragId === props.id;
  return (
    <div
      ref={props.drag.rowRef(props.id)}
      style={{
        ...card,
        border: `1.5px solid ${colors.border}`,
        display: "flex",
        alignItems: "stretch",
        padding: 0,
        opacity: isDragging ? 0.85 : 1,
        boxShadow: isDragging ? "0 6px 18px rgba(0,0,0,0.18)" : card.boxShadow,
        transform: isDragging ? "scale(1.02)" : undefined,
        transition: "transform 0.1s",
        position: "relative",
        zIndex: isDragging ? 2 : 1,
      }}
    >
      {props.draggable ? (
        <span
          {...props.drag.handleProps(props.id)}
          title="끌어서 순서 바꾸기"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 10px 0 14px",
            fontSize: 18,
            color: colors.textMuted,
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          ⠿
        </span>
      ) : (
        <span style={{ width: 14 }} />
      )}
      {props.children}
    </div>
  );
}

const rowBtn: React.CSSProperties = {
  flex: 1,
  textAlign: "left",
  background: "none",
  border: "none",
  padding: "12px 14px 12px 0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontFamily,
};

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

  // 활동 영역(범주): "areas" = 영역 목록 화면, "area" = 한 영역 안의 세부활동 목록 화면
  const [areas, setAreas] = useState<Area[]>([]);
  const [view, setView] = useState<"areas" | "area">("areas");
  const [currentAreaId, setCurrentAreaId] = useState(""); // "" = 미분류
  const [showNewArea, setShowNewArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [areaMsg, setAreaMsg] = useState("");

  const activitiesRef = useRef<Activity[]>([]);
  activitiesRef.current = activities;
  const areasRef = useRef<Area[]>([]);
  areasRef.current = areas;

  function inArea(a: Activity, areaId: string) {
    return (a.areaId || "") === areaId;
  }

  const areaDrag = useDragReorder({
    getIds: () => areasRef.current.map((a) => a.areaId),
    apply: (ids) => setAreas(ids.map((id) => areasRef.current.find((a) => a.areaId === id)!).filter(Boolean)),
    save: async (ids) =>
      (
        await fetch("/api/admin/activity-areas/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ areaIds: ids }),
        })
      ).ok,
    onFail: () => refresh(),
  });

  const activityDrag = useDragReorder({
    getIds: () => activitiesRef.current.filter((a) => inArea(a, currentAreaId)).map((a) => a.activityId),
    apply: (ids) => {
      const all = activitiesRef.current;
      const moved = ids.map((id) => all.find((a) => a.activityId === id)!).filter(Boolean);
      setActivities([...all.filter((a) => !ids.includes(a.activityId)), ...moved]);
    },
    save: async (ids) =>
      (
        await fetch("/api/admin/activities/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityIds: ids }),
        })
      ).ok,
    onFail: () => refresh(),
  });

  async function addArea() {
    const name = newAreaName.trim();
    if (!name) {
      setAreaMsg("활동 영역 이름을 입력하세요.");
      return;
    }
    const res = await fetch("/api/admin/activity-areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setNewAreaName("");
      setShowNewArea(false);
      setAreaMsg("");
      await refresh();
    } else {
      setAreaMsg("실패: " + data.error);
    }
  }

  async function renameArea(area: Area) {
    const name = window.prompt("활동 영역 이름을 수정하세요", area.name);
    if (name == null || !name.trim() || name.trim() === area.name) return;
    const res = await fetch("/api/admin/activity-areas/" + area.areaId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) await refresh();
    else alert("수정 실패: " + data.error);
  }

  async function deleteArea(area: Area) {
    const n = activities.filter((a) => inArea(a, area.areaId)).length;
    const note = n > 0 ? `\n안에 있는 활동 ${n}개는 지워지지 않고 "미분류"로 옮겨져요.` : "";
    if (!confirm(`"${area.name}" 영역을 삭제하시겠어요?${note}`)) return;
    const res = await fetch("/api/admin/activity-areas/" + area.areaId, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setView("areas");
      await refresh();
    } else {
      alert("삭제 실패: " + data.error);
    }
  }

  function openArea(areaId: string) {
    setCurrentAreaId(areaId);
    setView("area");
    window.scrollTo(0, 0);
  }

  async function refresh() {
    const res = await fetch("/api/admin/activities");
    if (res.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setActivities(await res.json());
    const arRes = await fetch("/api/admin/activity-areas");
    if (arRes.ok) setAreas(await arRes.json());
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
    setDraft(emptyDraft(currentAreaId));
    setMode("add");
    setMsg("");
  }

  function startEdit(a: Activity) {
    setEditingId(a.activityId);
    setDraft({
      name: a.name,
      areaId: a.areaId || "",
      hasCheck: a.hasCheck,
      hasCount: a.hasCount,
      targetCount: a.targetCount != null ? String(a.targetCount) : "3",
      hasScore: a.hasScore,
      maxScore: a.maxScore != null ? String(a.maxScore) : "100",
      hasPhotoSubmission: a.hasPhotoSubmission,
      hasAudioSubmission: a.hasAudioSubmission,
      hasVideoSubmission: a.hasVideoSubmission,
      hasFileSubmission: a.hasFileSubmission,
      hasQrScan: a.hasQrScan,
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
      draft.hasAudioSubmission || draft.hasVideoSubmission || draft.hasFileSubmission ||
      draft.hasQrScan;
    const anyMaterial = !!draft.materialLinkUrl.trim() || !!draft.materialVideoId || !!draft.materialPhotoFile || !!draft.materialDocFile;
    if (!anySubmit && !anyMaterial && mode === "add") {
      setMsg("최소 하나의 항목을 선택하세요.");
      return;
    }

    setSaving(true);
    setMsg("");

    const fd = new FormData();
    fd.append("name", draft.name.trim());
    fd.append("areaId", draft.areaId);
    fd.append("hasCheck", String(draft.hasCheck));
    fd.append("hasCount", String(draft.hasCount));
    if (draft.hasCount) fd.append("targetCount", draft.targetCount);
    fd.append("hasScore", String(draft.hasScore));
    if (draft.hasScore) fd.append("maxScore", draft.maxScore);
    fd.append("hasPhotoSubmission", String(draft.hasPhotoSubmission));
    fd.append("hasAudioSubmission", String(draft.hasAudioSubmission));
    fd.append("hasVideoSubmission", String(draft.hasVideoSubmission));
    fd.append("hasFileSubmission", String(draft.hasFileSubmission));
    fd.append("hasQrScan", String(draft.hasQrScan));
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
      // 저장한 활동이 들어간 영역 화면으로 돌아간다
      setCurrentAreaId(draft.areaId);
      setView("area");
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

  if (mode === "add" || mode === "edit") {
    const editingActivity = mode === "edit" ? activities.find((a) => a.activityId === editingId) : null;
    return (
      <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: colors.navy }}>{mode === "edit" ? "활동 수정" : "활동 추가"}</h1>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            placeholder="활동명 (예: 팝송부르기, 단어시험, 말하기)"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            style={box}
          />

          <div>
            <label style={{ fontSize: 13, color: colors.textSecondary, display: "block", marginBottom: 4 }}>활동 영역</label>
            <select value={draft.areaId} onChange={(e) => setDraft({ ...draft, areaId: e.target.value })} style={box}>
              {areas.map((ar) => (
                <option key={ar.areaId} value={ar.areaId}>
                  {ar.name}
                </option>
              ))}
              <option value="">미분류</option>
            </select>
          </div>

          <div>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: colors.navy }}>학생이 해야 할 것</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUBMIT_FEATURES.map((f) => (
                <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", ...card }}>
                  <input type="checkbox" checked={!!draft[f.key]} onChange={() => toggleFeature(f.key)} style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: 14, color: colors.navy }}>{f.label}</span>
                  {f.key === "hasCount" && draft.hasCount && (
                    <input
                      type="number"
                      min={1}
                      placeholder="목표 횟수"
                      value={draft.targetCount}
                      onChange={(e) => setDraft({ ...draft, targetCount: e.target.value })}
                      style={{ width: 90, marginLeft: "auto", padding: 8, borderRadius: 8, border: `1px solid ${colors.border}` }}
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
                      style={{ width: 90, marginLeft: "auto", padding: 8, borderRadius: 8, border: `1px solid ${colors.border}` }}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: colors.navy }}>관리자가 학생에게 보여줄 자료</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, ...card, padding: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: colors.textSecondary, display: "block", marginBottom: 4 }}>참고 링크 URL</label>
                <input
                  placeholder="https://..."
                  value={draft.materialLinkUrl}
                  onChange={(e) => setDraft({ ...draft, materialLinkUrl: e.target.value })}
                  style={box}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: colors.textSecondary, display: "block", marginBottom: 4 }}>학습영상 (미리 올려둔 영상 중 선택)</label>
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
                <label style={{ fontSize: 13, color: colors.textSecondary, display: "block", marginBottom: 4 }}>참고 사진</label>
                {mode === "edit" && editingActivity?.materialPhotoFilename && !draft.removeMaterialPhoto && (
                  <div style={{ fontSize: 13, marginBottom: 4, color: colors.navy }}>
                    현재: {editingActivity.materialPhotoFilename}{" "}
                    <button type="button" onClick={() => setDraft({ ...draft, removeMaterialPhoto: true })} style={{ fontSize: 12, padding: "2px 8px", color: colors.pink, border: `1px solid ${colors.pink}`, borderRadius: 6, background: "none", cursor: "pointer" }}>
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
                <label style={{ fontSize: 13, color: colors.textSecondary, display: "block", marginBottom: 4 }}>참고 파일</label>
                {mode === "edit" && editingActivity?.materialDocFilename && !draft.removeMaterialDoc && (
                  <div style={{ fontSize: 13, marginBottom: 4, color: colors.navy }}>
                    현재: {editingActivity.materialDocFilename}{" "}
                    <button type="button" onClick={() => setDraft({ ...draft, removeMaterialDoc: true })} style={{ fontSize: 12, padding: "2px 8px", color: colors.pink, border: `1px solid ${colors.pink}`, borderRadius: 6, background: "none", cursor: "pointer" }}>
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

          {msg && <p style={{ fontSize: 13, color: colors.pink }}>{msg}</p>}

          <button type="submit" disabled={saving} style={primaryBtn}>
            {saving ? "저장 중..." : "저장"}
          </button>
          <button type="button" onClick={cancel} style={secondaryBtn}>
            취소
          </button>
          {mode === "edit" && (
            <button
              type="button"
              onClick={() => handleDelete(editingId)}
              style={{ padding: 12, fontSize: 14, fontWeight: 700, color: colors.pink, border: `1px solid ${colors.pink}`, borderRadius: 10, background: "none", cursor: "pointer" }}
            >
              활동 삭제
            </button>
          )}
        </form>
      </div>
    );
  }

  if (view === "areas") {
    const unassignedCount = activities.filter((a) => !a.areaId).length;
    return (
      <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: colors.navy }}>활동 만들기</h1>
        {areas.length === 0 && unassignedCount === 0 && (
          <p style={{ color: colors.textSecondary }}>아직 만든 활동 영역이 없어요. 아래에서 먼저 영역을 추가하세요.</p>
        )}
        {areas.length > 1 && (
          <p style={{ fontSize: 12, color: areaDrag.msg ? colors.navy : colors.textMuted, marginBottom: 8 }}>
            {areaDrag.msg || "왼쪽 ⠿ 를 잡고 끌어서 순서를 바꿀 수 있어요"}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {areas.map((ar) => {
            const n = activities.filter((a) => inArea(a, ar.areaId)).length;
            return (
              <DragRow key={ar.areaId} id={ar.areaId} drag={areaDrag} draggable={areas.length > 1}>
                <button onClick={() => openArea(ar.areaId)} style={rowBtn}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: colors.navy }}>📁 {ar.name}</span>
                  <span style={{ fontSize: 13, color: colors.textSecondary, whiteSpace: "nowrap" }}>세부활동 {n}개 ›</span>
                </button>
              </DragRow>
            );
          })}
          {unassignedCount > 0 && (
            <DragRow id="__none" drag={areaDrag} draggable={false}>
              <button onClick={() => openArea("")} style={rowBtn}>
                <span style={{ fontSize: 15, fontWeight: 700, color: colors.textSecondary }}>🗂️ 미분류</span>
                <span style={{ fontSize: 13, color: colors.textSecondary, whiteSpace: "nowrap" }}>활동 {unassignedCount}개 ›</span>
              </button>
            </DragRow>
          )}
        </div>
        {showNewArea ? (
          <div style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              autoFocus
              placeholder="활동 영역 이름 (예: Easy Link 4)"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addArea();
              }}
              style={box}
            />
            {areaMsg && <p style={{ fontSize: 13, color: colors.pink, margin: 0 }}>{areaMsg}</p>}
            <button onClick={addArea} style={primaryBtn}>
              영역 만들기
            </button>
            <button
              onClick={() => {
                setShowNewArea(false);
                setNewAreaName("");
                setAreaMsg("");
              }}
              style={secondaryBtn}
            >
              취소
            </button>
          </div>
        ) : (
          <button onClick={() => setShowNewArea(true)} style={{ ...primaryBtn, width: "100%" }}>
            ＋ 활동 영역 추가하기
          </button>
        )}
      </div>
    );
  }

  const currentArea = areas.find((ar) => ar.areaId === currentAreaId) || null;
  const visible = activities.filter((a) => inArea(a, currentAreaId));
  return (
    <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily }}>
      <button onClick={() => setView("areas")} style={{ ...secondaryBtn, padding: "8px 14px", marginBottom: 12 }}>
        ← 활동 영역 목록
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: colors.navy, margin: 0, flex: 1 }}>
          {currentArea ? "📁 " + currentArea.name : "🗂️ 미분류"}
        </h1>
        {currentArea && (
          <>
            <button onClick={() => renameArea(currentArea)} style={{ ...secondaryBtn, padding: "6px 12px", fontSize: 13 }}>
              이름 수정
            </button>
            <button
              onClick={() => deleteArea(currentArea)}
              style={{ padding: "6px 12px", fontSize: 13, fontWeight: 700, color: colors.pink, border: `1px solid ${colors.pink}`, borderRadius: 10, background: "none", cursor: "pointer" }}
            >
              영역 삭제
            </button>
          </>
        )}
      </div>
      {!currentArea && (
        <p style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
          영역이 정해지지 않은 활동이에요. 활동을 눌러 "활동 영역"을 고르면 그 영역으로 옮겨져요.
        </p>
      )}
      {visible.length === 0 && <p style={{ color: colors.textSecondary }}>아직 세부활동이 없어요.</p>}
      {visible.length > 1 && (
        <p style={{ fontSize: 12, color: activityDrag.msg ? colors.navy : colors.textMuted, marginBottom: 8 }}>
          {activityDrag.msg || "왼쪽 ⠿ 를 잡고 끌어서 순서를 바꿀 수 있어요"}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {visible.map((a) => {
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
            <DragRow key={a.activityId} id={a.activityId} drag={activityDrag} draggable={visible.length > 1}>
              <button onClick={() => startEdit(a)} style={rowBtn}>
                <span style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>{a.name}</span>
                <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{tags}</span>
              </button>
            </DragRow>
          );
        })}
      </div>
      <button onClick={startAdd} style={{ ...primaryBtn, width: "100%" }}>
        ＋ 세부활동 추가하기
      </button>
    </div>
  );
}
