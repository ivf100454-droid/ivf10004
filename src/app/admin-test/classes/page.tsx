"use client";

import { useEffect, useState } from "react";
import { colors, fontFamily } from "../theme";

type ClassItem = {
  classId: string;
  name: string;
  sortOrder: number;
  studentCount: number;
  templateId: string | null;
  templateName: string | null;
};
type Template = { templateId: string; name: string };
type Student = {
  studentId: string;
  name: string;
  currentClassId: string | null;
};

const STANDARD_CLASS_NAMES = [
  "Phonics 1", "Phonics 2", "Phonics 3",
  "Basic 1", "Basic 2", "Basic 3",
  "Starter 1", "Starter 2", "Starter 3",
  "Jump 1", "Jump 2", "Jump 3",
  "Up 1", "Up 2", "Up 3",
  "Top 1", "Top 2", "Top 3",
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
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 700,
  color: "#fff",
  background: colors.blueGradient,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 600,
  color: colors.blue,
  background: colors.blueLight,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

export default function ClassesPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [classMsg, setClassMsg] = useState("");
  const [creatingName, setCreatingName] = useState<string | null>(null);
  const [customClassName, setCustomClassName] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editMsg, setEditMsg] = useState("");

  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  async function refresh() {
    const [cRes, tRes, sRes] = await Promise.all([
      fetch("/api/admin/classes"),
      fetch("/api/admin/templates"),
      fetch("/api/admin/students"),
    ]);
    if (cRes.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setClasses(await cRes.json());
    setTemplates(await tRes.json());
    setStudents(await sRes.json());
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

  async function handleCreateClass(name: string) {
    setCreatingName(name);
    setClassMsg("");
    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setClassMsg(`"${data.name}" 수업 생성됨`);
      await refresh();
    } else {
      setClassMsg(`실패: ${data.error}`);
    }
    setCreatingName(null);
  }

  function dragStart(idx: number) {
    setDragIdx(idx);
  }
  function dragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...classes];
    const moved = next.splice(dragIdx, 1)[0];
    next.splice(idx, 0, moved);
    setClasses(next);
    setDragIdx(idx);
  }
  async function dragEnd() {
    setDragIdx(null);
    await fetch("/api/admin/classes/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classIds: classes.map((c) => c.classId) }),
    });
  }

  function openEdit(c: ClassItem) {
    setEditingId(c.classId);
    setEditName(c.name);
    setEditMsg("");
  }
  function closeEdit() {
    setEditingId("");
    setEditMsg("");
  }

  async function saveEditName() {
    if (!editName.trim()) return;
    const res = await fetch("/api/admin/classes/" + editingId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await refresh();
    } else {
      setEditMsg("실패: " + data.error);
    }
  }

  async function setClassTemplate(templateId: string | null) {
    const res = await fetch("/api/admin/classes/" + editingId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await refresh();
    } else {
      setEditMsg("실패: " + data.error);
    }
  }

  async function handleDeleteClass() {
    if (!confirm("이 수업을 삭제하시겠어요?")) return;
    let res = await fetch("/api/admin/classes/" + editingId, { method: "DELETE" });
    let data = await res.json().catch(() => ({}));
    if (res.status === 409 && data.error === "confirmation_required") {
      if (!confirm(data.message + "\n그래도 삭제하시겠어요?")) return;
      res = await fetch("/api/admin/classes/" + editingId + "?force=true", { method: "DELETE" });
      data = await res.json().catch(() => ({}));
    }
    if (res.ok) {
      closeEdit();
      await refresh();
    } else {
      setEditMsg("실패: " + data.error);
    }
  }

  async function handleAssignStudent(studentId: string, classId: string) {
    setSavingStudentId(studentId);
    await fetch(`/api/admin/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: classId || null }),
    });
    await refresh();
    setSavingStudentId(null);
  }

  const editingClass = classes.find((c) => c.classId === editingId);
  const existingNames = new Set(classes.map((c) => c.name));
  const availableNames = STANDARD_CLASS_NAMES.filter((n) => !existingNames.has(n));

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

  if (editingId && editingClass) {
    return (
      <div style={{ maxWidth: 520, margin: "24px auto", padding: 16, fontFamily }}>
        <button onClick={closeEdit} style={{ marginBottom: 16, padding: "6px 12px", fontSize: 13, background: "none", border: "none", color: colors.textSecondary, cursor: "pointer" }}>
          ← 목록으로
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 16, color: colors.navy }}>수업 정보</h1>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ ...box, flex: 1 }} />
          <button onClick={saveEditName} style={{ ...primaryBtn, padding: "0 18px" }}>
            저장
          </button>
        </div>

        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: colors.navy }}>체크리스트</p>
        <div style={{ ...card, padding: 14, marginBottom: 20 }}>
          {editingClass.templateName ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: colors.navy }}>{editingClass.templateName}</span>
              <button onClick={() => setClassTemplate(null)} style={ghostBtn}>
                연결 해제
              </button>
            </div>
          ) : templates.length === 0 ? (
            <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0 }}>
              아직 생성된 체크리스트 템플릿이 없습니다. 템플릿 생성 후 다시 시도하세요.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {templates.map((t) => (
                <button
                  key={t.templateId}
                  onClick={() => setClassTemplate(t.templateId)}
                  style={{ textAlign: "left", padding: 10, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg, cursor: "pointer", fontSize: 14, color: colors.navy }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {editMsg && <p style={{ fontSize: 13, color: colors.pink, marginBottom: 8 }}>{editMsg}</p>}

        <button
          onClick={handleDeleteClass}
          style={{ width: "100%", padding: 12, fontSize: 14, fontWeight: 700, color: colors.pink, border: `1px solid ${colors.pink}`, borderRadius: 10, background: "none", cursor: "pointer" }}
        >
          수업 삭제
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "24px auto", padding: 16, fontFamily }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: colors.navy }}>수업 생성</h1>

      {classes.length === 0 ? (
        <p style={{ color: colors.textSecondary, marginBottom: 12 }}>아직 생성된 수업이 없습니다.</p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>길게 눌러 순서를 바꿀 수 있어요</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {classes.map((c, idx) => (
              <div
                key={c.classId}
                draggable
                onDragStart={() => dragStart(idx)}
                onDragOver={(e) => dragOver(e, idx)}
                onDragEnd={dragEnd}
                onClick={() => openEdit(c)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  ...card,
                  padding: "12px 14px",
                  cursor: "pointer",
                }}
              >
                <span style={{ color: colors.textMuted }}>⠿</span>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: colors.blueLight,
                    color: colors.blue,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  🏫
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>
                    {c.name} <span style={{ color: colors.textMuted, fontWeight: 500 }}>({c.studentCount}명)</span>
                  </div>
                  <div style={{ fontSize: 12, color: colors.textSecondary }}>{c.templateName || "체크리스트 없음 · 눌러서 연결"}</div>
                </div>
                <span style={{ color: colors.textMuted }}>›</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ ...card, padding: 18, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10, color: colors.navy }}>수업 추가</h2>
        {availableNames.length === 0 ? (
          <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>기본 18개 클래스가 모두 생성되었습니다.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {availableNames.map((name) => (
              <button
                key={name}
                onClick={() => handleCreateClass(name)}
                disabled={creatingName === name}
                style={{
                  padding: "10px 4px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  background: colors.bg,
                  color: colors.navy,
                  cursor: "pointer",
                }}
              >
                {creatingName === name ? "..." : name}
              </button>
            ))}
          </div>
        )}

        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: colors.navy, marginBottom: 8 }}>직접 이름 입력해서 만들기</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = customClassName.trim();
              if (!trimmed) return;
              handleCreateClass(trimmed);
              setCustomClassName("");
            }}
            style={{ display: "flex", gap: 8 }}
          >
            <input
              placeholder="예: Winter Camp, 특강반"
              value={customClassName}
              onChange={(e) => setCustomClassName(e.target.value)}
              style={{ ...box, flex: 1 }}
            />
            <button
              type="submit"
              disabled={!customClassName.trim() || creatingName === customClassName.trim()}
              style={{ ...primaryBtn, padding: "0 18px" }}
            >
              추가
            </button>
          </form>
        </div>

        {classMsg && <p style={{ fontSize: 13, color: colors.blue, marginTop: 8 }}>{classMsg}</p>}
      </div>

      <div style={{ ...card, padding: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, color: colors.navy }}>학생별 수업 배정</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `1px solid ${colors.border}` }}>
              <th style={{ padding: 8, color: colors.textSecondary, fontWeight: 600 }}>이름</th>
              <th style={{ padding: 8, color: colors.textSecondary, fontWeight: 600 }}>현재 수업</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.studentId} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: 8, color: colors.navy, fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: 8 }}>
                  <select
                    value={s.currentClassId ?? ""}
                    disabled={savingStudentId === s.studentId}
                    onChange={(e) => handleAssignStudent(s.studentId, e.target.value)}
                    style={{ padding: 8, fontSize: 14, borderRadius: 8, border: `1px solid ${colors.border}` }}
                  >
                    <option value="">수업 없음</option>
                    {classes.map((c) => (
                      <option key={c.classId} value={c.classId}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
