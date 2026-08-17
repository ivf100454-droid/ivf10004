"use client";

import { useEffect, useState } from "react";

type ClassItem = { classId: string; name: string; sortOrder: number; studentCount: number };
type Student = { studentId: string; name: string; currentClassId: string | null };

type AssignedItem = {
  assignedItemId: string;
  title: string;
  completed: boolean;
};
type Assignment = { assignmentId: string; reviewedAt: string | null; items: AssignedItem[] };
type TodayData = { date: string; assignments: Assignment[]; progress: number };

const MONTH_NAMES = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

export default function StatusPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [screen, setScreen] = useState<"classes" | "students" | "detail">("classes");
  const [activeClassId, setActiveClassId] = useState("");
  const [activeStudentId, setActiveStudentId] = useState("");

  const [today, setToday] = useState<TodayData | null>(null);
  const [reviewedDays, setReviewedDays] = useState<number[]>([]);
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const [reviewMsg, setReviewMsg] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  async function refreshBase() {
    const [cRes, sRes] = await Promise.all([fetch("/api/admin/classes"), fetch("/api/admin/students")]);
    if (cRes.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setClasses(await cRes.json());
    setStudents(await sRes.json());
  }

  useEffect(() => {
    refreshBase();
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
      await refreshBase();
    } else {
      const data = await res.json().catch(() => ({}));
      setLoginMsg(data.error || "로그인 실패");
    }
  }

  function openClass(classId: string) {
    setActiveClassId(classId);
    setScreen("students");
  }

  async function loadCalendar(studentId: string, year: number, month: number) {
    const res = await fetch(`/api/admin/students/${studentId}/calendar?year=${year}&month=${month}`);
    if (res.ok) {
      const data = await res.json();
      setReviewedDays(data.reviewedDays);
    }
  }

  async function loadToday(studentId: string) {
    const res = await fetch(`/api/admin/students/${studentId}/today`);
    if (res.ok) {
      setToday(await res.json());
    }
  }

  async function openStudent(studentId: string) {
    setActiveStudentId(studentId);
    setScreen("detail");
    setShareUrl("");
    setShareMsg("");
    setReviewMsg("");
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    setCalYear(y);
    setCalMonth(m);
    await Promise.all([loadToday(studentId), loadCalendar(studentId, y, m)]);
  }

  async function navMonth(delta: number) {
    let y = calYear;
    let m = calMonth + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setCalYear(y);
    setCalMonth(m);
    await loadCalendar(activeStudentId, y, m);
  }

  async function handleReview() {
    setReviewMsg("처리 중...");
    const res = await fetch(`/api/admin/students/${activeStudentId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setReviewMsg("확인 완료로 표시했습니다.");
      await Promise.all([loadToday(activeStudentId), loadCalendar(activeStudentId, calYear, calMonth)]);
    } else {
      setReviewMsg("실패: " + data.error);
    }
  }

  async function handleShareLink() {
    setShareMsg("생성 중...");
    setShareUrl("");
    const res = await fetch(`/api/admin/students/${activeStudentId}/share-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setShareUrl(window.location.origin + "/share/" + data.token);
      setShareMsg("링크가 생성되었습니다 (30일간 유효).");
    } else {
      setShareMsg("실패: " + data.error);
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

  if (screen === "students") {
    const cls = classes.find((c) => c.classId === activeClassId);
    const list = students.filter((s) => s.currentClassId === activeClassId);
    return (
      <div style={{ maxWidth: 480, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
        <button onClick={() => setScreen("classes")} style={{ marginBottom: 16, padding: "6px 12px", fontSize: 13 }}>
          ← 수업 목록으로
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>{cls?.name}</h1>
        {list.length === 0 ? (
          <p style={{ color: "#888" }}>이 수업에 배치된 학생이 없습니다.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((s) => (
              <button
                key={s.studentId}
                onClick={() => openStudent(s.studentId)}
                style={{ textAlign: "left", padding: "12px 14px", fontSize: 15 }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (screen === "detail") {
    const student = students.find((s) => s.studentId === activeStudentId);
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const reviewedToday = today && today.assignments.length > 0 && today.assignments.every((a) => !!a.reviewedAt);

    return (
      <div style={{ maxWidth: 480, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
        <button onClick={() => setScreen("students")} style={{ marginBottom: 16, padding: "6px 12px", fontSize: 13 }}>
          ← 학생 목록으로
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>{student?.name}</h1>

        <div style={{ background: "#f5f5f5", borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>오늘의 체크리스트</p>
          {!today || today.assignments.length === 0 ? (
            <p style={{ fontSize: 13, color: "#888", margin: 0 }}>오늘 배정된 체크리스트가 없습니다.</p>
          ) : (
            <>
              <div style={{ background: "#eee", borderRadius: 6, overflow: "hidden", height: 14, marginBottom: 6 }}>
                <div style={{ width: `${today.progress}%`, background: "#4caf50", height: "100%" }} />
              </div>
              <p style={{ fontSize: 13, marginBottom: 10 }}>진행률 {today.progress}%</p>
              {today.assignments.flatMap((a) => a.items).map((item) => (
                <div key={item.assignedItemId} style={{ fontSize: 14, padding: "3px 0" }}>
                  {item.completed ? "✅" : "⬜"} {item.title}
                </div>
              ))}
              <button
                onClick={handleReview}
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: 12,
                  fontSize: 15,
                  background: reviewedToday ? "#e8f5e9" : "#222",
                  color: reviewedToday ? "#2e7d32" : "#fff",
                  border: "none",
                  borderRadius: 8,
                }}
              >
                {reviewedToday ? "확인 완료됨" : "확인 완료"}
              </button>
              {reviewMsg && <p style={{ fontSize: 13, marginTop: 6 }}>{reviewMsg}</p>}
            </>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button onClick={() => navMonth(-1)} style={{ padding: "6px 12px" }}>
            ‹
          </button>
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {calYear}년 {MONTH_NAMES[calMonth - 1]}
          </span>
          <button onClick={() => navMonth(1)} style={{ padding: "6px 12px" }}>
            ›
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 20 }}>
          {cells.map((d, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                borderRadius: "50%",
                background: d && reviewedDays.indexOf(d) !== -1 ? "#4a90d9" : "transparent",
                color: d && reviewedDays.indexOf(d) !== -1 ? "#fff" : "#333",
              }}
            >
              {d || ""}
            </div>
          ))}
        </div>

        <button onClick={handleShareLink} style={{ width: "100%", padding: 12, fontSize: 15, marginBottom: 8 }}>
          학부모 공유링크 만들기
        </button>
        {shareMsg && <p style={{ fontSize: 13 }}>{shareMsg}</p>}
        {shareUrl && (
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
            style={{ ...box, fontSize: 13 }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>체크리스트 완료 현황</h1>
      {classes.length === 0 ? (
        <p style={{ color: "#888" }}>아직 생성된 수업이 없습니다.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {classes.map((c) => (
            <button
              key={c.classId}
              onClick={() => openClass(c.classId)}
              style={{ textAlign: "left", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ fontSize: 15, fontWeight: 500 }}>{c.name}</span>
              <span style={{ fontSize: 13, color: "#888" }}>{c.studentCount}명 ›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
