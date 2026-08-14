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

/**
 * 임시 테스트 페이지. 로그인 → 학생 등록 → 목록 확인까지 한 화면에서 검증한다.
 * 실제 관리자 대시보드 UI가 만들어지기 전까지의 동작 확인용.
 */
export default function StudentsTestPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [name, setName] = useState("");
  const [studentLoginId, setStudentLoginId] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [classId, setClassId] = useState("");
  const [regMsg, setRegMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function refreshLists() {
    const [sRes, cRes] = await Promise.all([
      fetch("/api/admin/students"),
      fetch("/api/admin/classes"),
    ]);
    if (sRes.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setStudents(await sRes.json());
    setClasses(await cRes.json());
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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setRegMsg("");
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          loginId: studentLoginId,
          initialPassword,
          classId: classId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRegMsg(`등록 완료: ${data.loginId}`);
        setName("");
        setStudentLoginId("");
        setInitialPassword("");
        setClassId("");
        await refreshLists();
      } else {
        setRegMsg(`실패(${res.status}): ${data.error}`);
      }
    } finally {
      setLoading(false);
    }
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
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>학생 등록</h1>
      <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input placeholder="학생 이름" value={name} onChange={(e) => setName(e.target.value)} style={box} required />
        <input
          placeholder="학생 로그인 아이디"
          value={studentLoginId}
          onChange={(e) => setStudentLoginId(e.target.value)}
          style={box}
          required
        />
        <input
          placeholder="초기 비밀번호"
          value={initialPassword}
          onChange={(e) => setInitialPassword(e.target.value)}
          style={box}
          required
        />
        <select value={classId} onChange={(e) => setClassId(e.target.value)} style={box}>
          <option value="">클래스 없음</option>
          {classes.map((c) => (
            <option key={c.classId} value={c.classId}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={loading} style={{ padding: 12, fontSize: 16 }}>
          {loading ? "등록 중..." : "학생 등록"}
        </button>
      </form>
      {regMsg && <p>{regMsg}</p>}

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>등록된 학생 ({students.length}명)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th style={{ padding: 6 }}>이름</th>
            <th style={{ padding: 6 }}>로그인ID</th>
            <th style={{ padding: 6 }}>상태</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.studentId} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 6 }}>{s.name}</td>
              <td style={{ padding: 6 }}>{s.account?.loginId}</td>
              <td style={{ padding: 6 }}>{s.studentStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
