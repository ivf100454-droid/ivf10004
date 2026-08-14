"use client";

import { useEffect, useState } from "react";

type Student = {
  studentId: string;
  name: string;
  currentClassId: string | null;
  account: { loginId: string } | null;
};
type ClassItem = { classId: string; name: string; _count?: { students: number } };

export default function ClassesTestPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [newClassName, setNewClassName] = useState("");
  const [classMsg, setClassMsg] = useState("");
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  async function refreshLists() {
    const [cRes, sRes] = await Promise.all([
      fetch("/api/admin/classes"),
      fetch("/api/admin/students"),
    ]);
    if (cRes.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setClasses(await cRes.json());
    setStudents(await sRes.json());
  }

  useEffect(() => {
    refreshLists();
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
      await refreshLists();
    } else {
      const data = await res.json().catch(() => ({}));
      setLoginMsg(data.error || "로그인 실패");
    }
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setClassMsg("");
    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newClassName }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setClassMsg(`"${data.name}" 클래스 생성됨`);
      setNewClassName("");
      await refreshLists();
    } else {
      setClassMsg(`실패: ${data.error}`);
    }
  }

  async function handleAssign(studentId: string, classId: string) {
    setSavingStudentId(studentId);
    await fetch(`/api/admin/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: classId || null }),
    });
    await refreshLists();
    setSavingStudentId(null);
  }

  const box: React.CSSProperties = { padding: 10, fontSize: 16, width: "100%", boxSizing: "border-box" };

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
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>클래스 관리</h1>

      <form onSubmit={handleCreateClass} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          placeholder="새 클래스 이름 (예: 2시 중급반)"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          style={{ ...box, flex: 1 }}
          required
        />
        <button type="submit" style={{ padding: "0 16px", fontSize: 16 }}>
          만들기
        </button>
      </form>
      {classMsg && <p style={{ fontSize: 14 }}>{classMsg}</p>}

      <h2 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>클래스 목록</h2>
      <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
        {classes.map((c) => (
          <li key={c.classId}>
            {c.name} ({c._count?.students ?? 0}명)
          </li>
        ))}
        {classes.length === 0 && <li style={{ color: "#888" }}>아직 클래스가 없습니다.</li>}
      </ul>

      <h2 style={{ fontSize: 16, marginBottom: 8 }}>학생별 클래스 배정</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th style={{ padding: 6 }}>이름</th>
            <th style={{ padding: 6 }}>현재 클래스</th>
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
                  onChange={(e) => handleAssign(s.studentId, e.target.value)}
                  style={{ padding: 6, fontSize: 14 }}
                >
                  <option value="">클래스 없음</option>
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
