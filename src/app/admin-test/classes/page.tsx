"use client";

import { useEffect, useState } from "react";

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

  const box: React.CSSProperties = { padding: 10, fontSize: 15, width: "100%", boxSizing: "border-box" };
  const editingClass = classes.find((c) => c.classId === editingId);
  const existingNames = new Set(classes.map((c) => c.name));
  const availableNames = STANDARD_CLASS_NAMES.filter((n) => !existingNames.has(n));

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

  if (editingId && editingClass) {
    return (
      <div style={{ maxWidth: 520, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
        <button onClick={closeEdit} style={{ marginBottom: 16, padding: "6px 12px", fontSize: 13 }}>
          ← 목록으로
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>수업 정보</h1>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ ...box, flex: 1 }} />
          <button onClick={saveEditName} style={{ padding: "0 16px" }}>
            저장
          </button>
        </div>

        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>체크리스트</p>
        <div style={{ background: "#f0f0f0", borderRadius: 8, padding: 12, marginBottom: 20 }}>
          {editingClass.templateName ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{editingClass.templateName}</span>
              <button onClick={() => setClassTemplate(null)} style={{ fontSize: 12, padding: "4px 8px" }}>
                연결 해제
              </button>
            </div>
          ) : templates.length === 0 ? (
            <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
              아직 생성된 체크리스트 템플릿이 없습니다. 템플릿 생성 후 다시 시도하세요.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {templates.map((t) => (
                <button key={t.templateId} onClick={() => setClassTemplate(t.templateId)} style={{ textAlign: "left", padding: 10 }}>
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {editMsg && <p style={{ fontSize: 13, color: "crimson", marginBottom: 8 }}>{editMsg}</p>}

        <button
          onClick={handleDeleteClass}
          style={{ width: "100%", padding: 10, fontSize: 14, color: "#c0392b", border: "1px solid #c0392b", borderRadius: 8, background: "none" }}
        >
          수업 삭제
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>수업 생성</h1>

      {classes.length === 0 ? (
        <p style={{ color: "#888", marginBottom: 12 }}>아직 생성된 수업이 없습니다.</p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>길게 눌러 순서를 바꿀 수 있어요</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
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
                  gap: 8,
                  background: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                }}
              >
                <span style={{ color: "#aaa" }}>⠿</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {c.name} <span style={{ color: "#888", fontWeight: 400 }}>({c.studentCount}명)</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#888" }}>{c.templateName || "체크리스트 없음 · 눌러서 연결"}</div>
                </div>
                <span style={{ color: "#aaa" }}>›</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontSize: 16, marginBottom: 8 }}>수업추가</h2>
      {availableNames.length === 0 ? (
        <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>기본 18개 클래스가 모두 생성되었습니다.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          {availableNames.map((name) => (
            <button
              key={name}
              onClick={() => handleCreateClass(name)}
              disabled={creatingName === name}
              style={{ padding: "10px 4px", fontSize: 13 }}
            >
              {creatingName === name ? "..." : name}
            </button>
          ))}
        </div>
      )}
      {classMsg && <p style={{ fontSize: 13, marginBottom: 16 }}>{classMsg}</p>}

      <h2 style={{ fontSize: 16, marginTop: 28, marginBottom: 8 }}>학생별 수업 배정</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th style={{ padding: 6 }}>이름</th>
            <th style={{ padding: 6 }}>현재 수업</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.studentId} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 6 }}>{s.name}</td>
              <td style={{ padding: 6 }}>
                <select
                  value={s.currentClassId ?? ""}
                  disabled={savingStudentId === s.studentId}
                  onChange={(e) => handleAssignStudent(s.studentId, e.target.value)}
                  style={{ padding: 6, fontSize: 14 }}
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
  );
}
