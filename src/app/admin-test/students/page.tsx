"use client";

import { useEffect, useState } from "react";

type Student = {
  studentId: string;
  name: string;
  studentStatus: string;
  currentClassId: string | null;
  account: { loginId: string; accountStatus: string } | null;
};
type ClassItem = { classId: string; name: string };

function genId() {
  return "std" + Math.floor(1000 + Math.random() * 9000);
}
function genPw() {
  return Math.random().toString(36).slice(2, 8);
}

export default function StudentsPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [mode, setMode] = useState<"list" | "add" | "edit">("list");

  const [name, setName] = useState("");
  const [newLoginId, setNewLoginId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [regMsg, setRegMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editMsg, setEditMsg] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [newIssuedPassword, setNewIssuedPassword] = useState("");

  async function refresh() {
    const [sRes, cRes] = await Promise.all([fetch("/api/admin/students"), fetch("/api/admin/classes")]);
    if (sRes.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setStudents(await sRes.json());
    setClasses(await cRes.json());
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
    setName("");
    setNewLoginId("");
    setNewPassword("");
    setNewClassId("");
    setRegMsg("");
    setMode("add");
  }

  function autoFillCreds() {
    setNewLoginId(genId());
    setNewPassword(genPw());
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setRegMsg("");
    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        loginId: newLoginId,
        initialPassword: newPassword,
        classId: newClassId || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await refresh();
      setMode("list");
    } else {
      setRegMsg(`실패: ${data.error}`);
    }
    setSaving(false);
  }

  function startEdit(s: Student) {
    setEditingId(s.studentId);
    setEditName(s.name);
    setEditClassId(s.currentClassId || "");
    setEditMsg("");
    setResetMsg("");
    setNewIssuedPassword("");
    setMode("edit");
  }

  async function saveEditName() {
    if (!editName.trim()) return;
    const res = await fetch("/api/admin/students/" + editingId, {
      method: "PATCH",
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

  async function saveEditClass(classId: string) {
    setEditClassId(classId);
    const res = await fetch("/api/admin/students/" + editingId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: classId || null }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await refresh();
    } else {
      setEditMsg("실패: " + data.error);
    }
  }

  async function handleResetPassword() {
    if (!confirm("이 학생의 비밀번호를 새로 발급하시겠어요? 기존 비밀번호로는 더 이상 로그인할 수 없습니다.")) return;
    setResetMsg("발급 중...");
    setNewIssuedPassword("");
    const res = await fetch("/api/admin/students/" + editingId + "/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setNewIssuedPassword(data.newPassword);
      setResetMsg("새 비밀번호가 발급되었습니다. 학생에게 전달해주세요 (다시 볼 수 없으니 지금 저장해두세요).");
    } else {
      setResetMsg("실패: " + data.error);
    }
  }

  async function handleWithdraw() {
    if (!confirm("이 학생을 퇴원 처리하시겠어요? 학습 기록은 보존되지만 더 이상 로그인할 수 없습니다.")) return;
    const res = await fetch("/api/admin/students/" + editingId + "/withdraw", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await refresh();
      setMode("list");
    } else {
      setEditMsg("실패: " + data.error);
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

  if (mode === "add") {
    return (
      <div style={{ maxWidth: 420, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>학생등록</h1>
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 13, color: "#666" }}>이름</label>
          <input placeholder="학생 이름" value={name} onChange={(e) => setName(e.target.value)} style={box} required />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "#666" }}>아이디 / 비밀번호</label>
            <button type="button" onClick={autoFillCreds} style={{ fontSize: 12, padding: "4px 8px" }}>
              자동생성
            </button>
          </div>
          <input placeholder="아이디" value={newLoginId} onChange={(e) => setNewLoginId(e.target.value)} style={box} required />
          <input placeholder="비밀번호" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={box} required />

          <label style={{ fontSize: 13, color: "#666" }}>수업 배치</label>
          <select value={newClassId} onChange={(e) => setNewClassId(e.target.value)} style={box}>
            <option value="">배치 보류</option>
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.name}
              </option>
            ))}
          </select>

          {regMsg && <p style={{ fontSize: 13, color: "crimson" }}>{regMsg}</p>}

          <button type="submit" disabled={saving} style={{ padding: 14, fontSize: 16, background: "#222", color: "#fff", border: "none", borderRadius: 8 }}>
            {saving ? "등록 중..." : "등록"}
          </button>
          <button type="button" onClick={() => setMode("list")} style={{ padding: 10, fontSize: 14 }}>
            취소
          </button>
        </form>
      </div>
    );
  }

  if (mode === "edit") {
    const student = students.find((s) => s.studentId === editingId);
    return (
      <div style={{ maxWidth: 420, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>학생 정보</h1>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ ...box, flex: 1 }} />
          <button onClick={saveEditName} style={{ padding: "0 16px" }}>
            저장
          </button>
        </div>

        <p style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>아이디</p>
        <p style={{ fontSize: 15, marginBottom: 16 }}>{student?.account?.loginId}</p>

        <p style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>수업 배치</p>
        <select value={editClassId} onChange={(e) => saveEditClass(e.target.value)} style={{ ...box, marginBottom: 16 }}>
          <option value="">배치 보류</option>
          {classes.map((c) => (
            <option key={c.classId} value={c.classId}>
              {c.name}
            </option>
          ))}
        </select>

        <div style={{ background: "#f5f5f5", borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>비밀번호</p>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
            보안을 위해 저장된 비밀번호는 확인할 수 없습니다. 학생이 잊어버렸다면 새로 발급해주세요.
          </p>
          <button onClick={handleResetPassword} style={{ padding: 10, fontSize: 14, width: "100%" }}>
            새 비밀번호 발급
          </button>
          {resetMsg && <p style={{ fontSize: 13, marginTop: 8 }}>{resetMsg}</p>}
          {newIssuedPassword && (
            <div style={{ marginTop: 8, padding: 10, background: "#fff3cd", borderRadius: 6, fontSize: 15, fontWeight: 600, textAlign: "center" }}>
              {newIssuedPassword}
            </div>
          )}
        </div>

        {editMsg && <p style={{ fontSize: 13, color: "crimson", marginBottom: 8 }}>{editMsg}</p>}

        <button onClick={() => setMode("list")} style={{ width: "100%", padding: 10, fontSize: 14, marginBottom: 8 }}>
          목록으로
        </button>
        <button
          onClick={handleWithdraw}
          style={{ width: "100%", padding: 10, fontSize: 14, color: "#c0392b", border: "1px solid #c0392b", borderRadius: 8, background: "none" }}
        >
          학생 삭제 (퇴원 처리)
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>학생등록</h1>
      {students.length === 0 ? (
        <p style={{ color: "#888", marginBottom: 16 }}>아직 등록된 학생이 없습니다.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {students.map((s) => {
            const cls = classes.find((c) => c.classId === s.currentClassId);
            return (
              <button
                key={s.studentId}
                onClick={() => startEdit(s)}
                style={{ textAlign: "left", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2 }}
              >
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  {s.name} {s.studentStatus === "withdrawn" && <span style={{ color: "#c0392b", fontSize: 12 }}>(퇴원)</span>}
                </span>
                <span style={{ fontSize: 12, color: "#888" }}>
                  ID {s.account?.loginId} · {cls ? cls.name : "배치 보류"}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <button onClick={startAdd} style={{ width: "100%", padding: 12, fontSize: 15 }}>
        + 학생등록
      </button>
    </div>
  );
}
