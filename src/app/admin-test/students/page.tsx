"use client";

import { useEffect, useState } from "react";
import { colors, fontFamily } from "../theme";

type Student = {
  studentId: string;
  name: string;
  studentStatus: string;
  currentClassId: string | null;
  account: { loginId: string; accountStatus: string } | null;
};
type ClassItem = { classId: string; name: string };

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
  const [resetPasswordInput, setResetPasswordInput] = useState("");

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
    setResetPasswordInput("");
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
    if (!resetPasswordInput.trim()) {
      setResetMsg("새 비밀번호를 입력하세요.");
      return;
    }
    if (!confirm("이 비밀번호로 변경하시겠어요? 기존 비밀번호로는 더 이상 로그인할 수 없습니다.")) return;
    setResetMsg("변경 중...");
    const res = await fetch("/api/admin/students/" + editingId + "/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: resetPasswordInput.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setResetMsg(`비밀번호가 "${data.newPassword}"(으)로 변경되었습니다.`);
      setResetPasswordInput("");
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

  if (mode === "add") {
    return (
      <div style={{ maxWidth: 420, margin: "24px auto", padding: 16, fontFamily }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: colors.navy }}>학생등록</h1>
        <div style={{ ...card, padding: 18 }}>
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 600 }}>이름</label>
            <input placeholder="학생 이름" value={name} onChange={(e) => setName(e.target.value)} style={box} required />

            <label style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 600 }}>아이디</label>
            <input placeholder="아이디" value={newLoginId} onChange={(e) => setNewLoginId(e.target.value)} style={box} required />

            <label style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 600 }}>비밀번호</label>
            <input placeholder="비밀번호" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={box} required />

            <label style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 600 }}>수업 배치</label>
            <select value={newClassId} onChange={(e) => setNewClassId(e.target.value)} style={box}>
              <option value="">배치 보류</option>
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.name}
                </option>
              ))}
            </select>

            {regMsg && <p style={{ fontSize: 13, color: colors.pink }}>{regMsg}</p>}

            <button type="submit" disabled={saving} style={{ ...primaryBtn, marginTop: 4 }}>
              {saving ? "등록 중..." : "등록"}
            </button>
            <button type="button" onClick={() => setMode("list")} style={secondaryBtn}>
              취소
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === "edit") {
    const student = students.find((s) => s.studentId === editingId);
    return (
      <div style={{ maxWidth: 420, margin: "24px auto", padding: 16, fontFamily }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: colors.navy }}>학생 정보</h1>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ ...box, flex: 1 }} />
          <button onClick={saveEditName} style={{ ...primaryBtn, padding: "0 18px" }}>
            저장
          </button>
        </div>

        <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>아이디</p>
        <p style={{ fontSize: 15, marginBottom: 16, color: colors.navy, fontWeight: 600 }}>{student?.account?.loginId}</p>

        <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>수업 배치</p>
        <select value={editClassId} onChange={(e) => saveEditClass(e.target.value)} style={{ ...box, marginBottom: 16 }}>
          <option value="">배치 보류</option>
          {classes.map((c) => (
            <option key={c.classId} value={c.classId}>
              {c.name}
            </option>
          ))}
        </select>

        <div style={{ ...card, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: colors.navy }}>비밀번호 변경</p>
          <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>
            보안을 위해 저장된 비밀번호는 확인할 수 없습니다. 새 비밀번호를 직접 정해서 입력해주세요.
          </p>
          <input
            placeholder="새 비밀번호"
            value={resetPasswordInput}
            onChange={(e) => setResetPasswordInput(e.target.value)}
            style={{ ...box, marginBottom: 8 }}
          />
          <button onClick={handleResetPassword} style={{ ...secondaryBtn, width: "100%" }}>
            비밀번호 변경
          </button>
          {resetMsg && <p style={{ fontSize: 13, marginTop: 8, color: colors.blue }}>{resetMsg}</p>}
        </div>

        {editMsg && <p style={{ fontSize: 13, color: colors.pink, marginBottom: 8 }}>{editMsg}</p>}

        <button onClick={() => setMode("list")} style={{ ...secondaryBtn, width: "100%", marginBottom: 8 }}>
          목록으로
        </button>
        <button
          onClick={handleWithdraw}
          style={{ width: "100%", padding: 12, fontSize: 14, fontWeight: 700, color: colors.pink, border: `1px solid ${colors.pink}`, borderRadius: 10, background: "none", cursor: "pointer" }}
        >
          학생 삭제 (퇴원 처리)
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "24px auto", padding: 16, fontFamily }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: colors.navy }}>학생등록</h1>
      {students.length === 0 ? (
        <p style={{ color: colors.textSecondary, marginBottom: 16 }}>아직 등록된 학생이 없습니다.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {students.map((s) => {
            const cls = classes.find((c) => c.classId === s.currentClassId);
            return (
              <button
                key={s.studentId}
                onClick={() => startEdit(s)}
                style={{
                  textAlign: "left",
                  ...card,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: colors.blueLight,
                    color: colors.blue,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  🧑‍🎓
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>
                    {s.name} {s.studentStatus === "withdrawn" && <span style={{ color: colors.pink, fontSize: 12, fontWeight: 600 }}>(퇴원)</span>}
                  </span>
                  <span style={{ fontSize: 12, color: colors.textSecondary }}>
                    ID {s.account?.loginId} · {cls ? cls.name : "배치 보류"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <button onClick={startAdd} style={{ ...primaryBtn, width: "100%" }}>
        + 학생등록
      </button>
    </div>
  );
}
