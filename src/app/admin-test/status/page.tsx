"use client";

import { useEffect, useState } from "react";

type Student = {
  studentId: string;
  name: string;
  currentClassId: string | null;
  studentStatus: string;
  currentClass: { name: string } | null;
};

type AssignedItem = {
  assignedItemId: string;
  title: string;
  completed: boolean;
};
type Assignment = { assignmentId: string; items: AssignedItem[] };
type TodayData = { date: string; assignments: Assignment[]; progress: number };
type CalendarDay = { day: number; progress: number };

type DayItem = {
  assignedItemId: string;
  title: string;
  hasCheck: boolean;
  checked: boolean;
  hasCount: boolean;
  currentCount: number;
  targetCount: number | null;
  hasScore: boolean;
  score: number | null;
  maxScore: number | null;
  linkUrl: string | null;
  linkLabel: string | null;
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
  hasFileSubmission: boolean;
  completed: boolean;
  photoUrl: string | null;
  photoMimeType: string | null;
  photoFilename: string | null;
  audioUrl: string | null;
  audioFilename: string | null;
  videoUrl: string | null;
  videoFilename: string | null;
  fileUrl: string | null;
  fileMimeType: string | null;
  fileFilename: string | null;
};
type DayAssignment = {
  assignmentId: string;
  reopenedForEditing: boolean;
  preservedByAdmin: boolean;
  deletionScheduledDate: string;
  items: DayItem[];
};
type DayData = { studentName: string; date: string; isToday: boolean; progress: number; assignments: DayAssignment[] };

const MONTH_NAMES = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

export default function StatusPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [todayProgress, setTodayProgress] = useState<Record<string, number>>({});

  const [screen, setScreen] = useState<"students" | "detail" | "day">("students");
  const [activeStudentId, setActiveStudentId] = useState("");

  const [today, setToday] = useState<TodayData | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const [shareMsg, setShareMsg] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  const [dayData, setDayData] = useState<DayData | null>(null);
  const [dayDateStr, setDayDateStr] = useState("");
  const [dayShareMsg, setDayShareMsg] = useState("");
  const [dayShareUrl, setDayShareUrl] = useState("");

  async function refreshBase() {
    const [sRes, pRes] = await Promise.all([
      fetch("/api/admin/students"),
      fetch("/api/admin/students/today-progress"),
    ]);
    if (sRes.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setStudents(await sRes.json());
    if (pRes.ok) setTodayProgress(await pRes.json());
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

  async function loadCalendar(studentId: string, year: number, month: number) {
    const res = await fetch(`/api/admin/students/${studentId}/calendar?year=${year}&month=${month}`);
    if (res.ok) {
      const data = await res.json();
      setCalendarDays(data.days);
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

  async function handleWeeklyShareLink() {
    setShareMsg("생성 중...");
    setShareUrl("");
    // 이번 주 월요일을 시작일로 계산한다 (한국 기준 오늘 요일에서 역산).
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const dow = kstNow.getUTCDay(); // 0=일 ~ 6=토
    const diffToMonday = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() + diffToMonday));
    const mondayStr = monday.toISOString().slice(0, 10);

    const res = await fetch(`/api/admin/students/${activeStudentId}/share-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistDate: mondayStr, rangeDays: 7 }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setShareUrl(window.location.origin + "/share/" + data.token);
      setShareMsg("이번 주(월~일) 요약 링크가 생성되었습니다 (30일간 유효).");
    } else {
      setShareMsg("실패: " + data.error);
    }
  }

  function pad2(n: number) {
    return n < 10 ? "0" + n : String(n);
  }

  async function openDay(d: number) {
    const dateStr = `${calYear}-${pad2(calMonth)}-${pad2(d)}`;
    setDayDateStr(dateStr);
    setDayData(null);
    setDayShareMsg("");
    setDayShareUrl("");
    setScreen("day");
    const res = await fetch(`/api/admin/students/${activeStudentId}/day?date=${dateStr}`);
    if (res.ok) {
      setDayData(await res.json());
    }
  }

  async function handleDayShareLink() {
    setDayShareMsg("생성 중...");
    setDayShareUrl("");
    const res = await fetch(`/api/admin/students/${activeStudentId}/share-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistDate: dayDateStr }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setDayShareUrl(window.location.origin + "/share/" + data.token);
      setDayShareMsg("링크가 생성되었습니다 (30일간 유효). 이 날짜 기록만 보여줘요.");
    } else {
      setDayShareMsg("실패: " + data.error);
    }
  }

  async function toggleReopen(assignmentId: string, reopened: boolean) {
    await fetch(`/api/admin/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reopened }),
    });
    const res = await fetch(`/api/admin/students/${activeStudentId}/day?date=${dayDateStr}`);
    if (res.ok) setDayData(await res.json());
  }

  async function togglePreserve(assignmentId: string, preserved: boolean) {
    await fetch(`/api/admin/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preserved }),
    });
    const res = await fetch(`/api/admin/students/${activeStudentId}/day?date=${dayDateStr}`);
    if (res.ok) setDayData(await res.json());
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

  if (screen === "detail") {
    const student = students.find((s) => s.studentId === activeStudentId);
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const progressByDay: Record<number, number> = {};
    calendarDays.forEach((d) => {
      progressByDay[d.day] = d.progress;
    });

    const todayNow = new Date();
    const todayY = todayNow.getFullYear();
    const todayM = todayNow.getMonth() + 1;
    const todayD = todayNow.getDate();
    const isPastOrToday = (d: number) =>
      calYear < todayY ||
      (calYear === todayY && calMonth < todayM) ||
      (calYear === todayY && calMonth === todayM && d <= todayD);

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
            </>
          )}
        </div>

        <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
          오늘 날짜는 진한 테두리로 표시돼요. 날짜 안 숫자는 그날의 진행률입니다 (10% 이상이면
          파란색). 월~금인데 체크리스트를 못했으면 빨간 테두리로 미완료 표시돼요 (토·일은
          제외). 날짜를 누르면 그날 제출한 자료를 볼 수 있어요.
        </p>
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
          {cells.map((d, i) => {
            const progress = d ? progressByDay[d] : undefined;
            const isActive = progress !== undefined && progress >= 10;
            const isToday = !!d && calYear === todayY && calMonth === todayM && d === todayD;
            const weekday = d ? new Date(calYear, calMonth - 1, d).getDay() : -1;
            const isWeekday = weekday >= 1 && weekday <= 5;
            const isIncomplete = !!d && isWeekday && isPastOrToday(d) && !isActive;
            return (
              <button
                key={i}
                onClick={() => d && openDay(d)}
                disabled={!d}
                style={{
                  aspectRatio: "1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  border: isIncomplete ? "2px solid #FF5A75" : "none",
                  boxShadow: isToday ? "0 0 0 2px #152A54" : "none",
                  cursor: d ? "pointer" : "default",
                  background: isActive ? "#4a90d9" : "transparent",
                  color: isActive ? "#fff" : isIncomplete ? "#FF5A75" : "#333",
                }}
              >
                {d ? (
                  isActive ? (
                    <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.1 }}>{progress}%</span>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: isIncomplete ? 700 : 400 }}>{d}</span>
                  )
                ) : (
                  ""
                )}
              </button>
            );
          })}
        </div>

        <button onClick={handleShareLink} style={{ width: "100%", padding: 12, fontSize: 15, marginBottom: 8 }}>
          학부모 공유링크 만들기 (오늘)
        </button>
        <button onClick={handleWeeklyShareLink} style={{ width: "100%", padding: 12, fontSize: 15, marginBottom: 8 }}>
          학부모 주간 요약 리포트 링크 만들기 (이번 주 월~일)
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

  if (screen === "day") {
    return (
      <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
        <button onClick={() => setScreen("detail")} style={{ marginBottom: 16, padding: "6px 12px", fontSize: 13 }}>
          ← 달력으로
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>{dayData?.studentName ?? "..."}</h1>
        <p style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>{dayDateStr}</p>

        {!dayData && <p style={{ color: "#888" }}>불러오는 중...</p>}

        {dayData && (
          <>
            <div style={{ background: "#eee", borderRadius: 8, overflow: "hidden", height: 16, marginBottom: 6 }}>
              <div style={{ width: `${dayData.progress}%`, background: "#4caf50", height: "100%" }} />
            </div>
            <p style={{ fontSize: 14, marginBottom: 16 }}>진행률 {dayData.progress}%</p>

            {dayData.assignments.length === 0 && (
              <p style={{ color: "#888" }}>이 날짜에 배정된 체크리스트가 없습니다.</p>
            )}

            {dayData.assignments.map((a) => (
              <div key={a.assignmentId}>
                {!dayData.isToday && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: a.reopenedForEditing ? "#fff7e6" : "#f5f5f5",
                      border: `1px solid ${a.reopenedForEditing ? "#f0b429" : "#ddd"}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      marginBottom: 10,
                      fontSize: 12,
                    }}
                  >
                    <span>
                      {a.reopenedForEditing
                        ? "🔓 지금 재오픈 중 — 학생이 이 날짜 기록을 수정/재제출할 수 있어요."
                        : "🔒 과거 기록이라 잠겨 있어요 — 학생이 수정할 수 없어요."}
                    </span>
                    <button
                      onClick={() => toggleReopen(a.assignmentId, !a.reopenedForEditing)}
                      style={{ padding: "5px 10px", fontSize: 12, cursor: "pointer" }}
                    >
                      {a.reopenedForEditing ? "다시 잠그기" : "재오픈"}
                    </button>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: a.preservedByAdmin ? "#eef7ee" : "#fafafa",
                    border: `1px solid ${a.preservedByAdmin ? "#4caf50" : "#eee"}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    marginBottom: 10,
                    fontSize: 12,
                  }}
                >
                  <span>
                    {a.preservedByAdmin
                      ? "🔒 보존 잠금 — 30일이 지나도 자동 정리에서 제외돼요."
                      : `🗑 삭제 예정일: ${a.deletionScheduledDate} (그 이후 자동 정리 대상)`}
                  </span>
                  <button
                    onClick={() => togglePreserve(a.assignmentId, !a.preservedByAdmin)}
                    style={{ padding: "5px 10px", fontSize: 12, cursor: "pointer" }}
                  >
                    {a.preservedByAdmin ? "보존 해제" : "보존하기"}
                  </button>
                </div>
                {a.items.map((item) => (
                  <div
                    key={item.assignedItemId}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 10,
                      background: item.completed ? "#f3fbf3" : "white",
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                      {item.completed ? "✅ " : "⬜ "}
                      {item.title}
                    </div>

                    {item.hasCheck && (
                      <div style={{ marginBottom: 6, fontSize: 14 }}>체크: {item.checked ? "완료" : "미완료"}</div>
                    )}
                    {item.hasCount && (
                      <div style={{ marginBottom: 6, fontSize: 14 }}>
                        {item.currentCount} / {item.targetCount}회
                      </div>
                    )}
                    {item.hasScore && (
                      <div style={{ marginBottom: 6, fontSize: 14 }}>
                        점수: {item.score != null ? item.score : "-"} / {item.maxScore}점
                      </div>
                    )}
                    {item.linkUrl && (
                      <a href={item.linkUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginBottom: 6 }}>
                        🔗 {item.linkLabel || "자료 열기"}
                      </a>
                    )}

                    {item.hasPhotoSubmission && item.photoUrl && (
                      <div style={{ marginTop: 6 }}>
                        {item.photoMimeType === "application/pdf" ? (
                          <iframe
                            src={item.photoUrl}
                            title={item.photoFilename || "제출 PDF"}
                            style={{ width: "100%", height: 400, border: "1px solid #ddd", borderRadius: 8 }}
                          />
                        ) : (
                          <img src={item.photoUrl} alt="제출 사진" style={{ maxWidth: "100%", borderRadius: 8 }} />
                        )}
                      </div>
                    )}
                    {item.hasPhotoSubmission && !item.photoUrl && (
                      <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>아직 제출된 사진이 없습니다.</div>
                    )}

                    {item.hasAudioSubmission && item.audioUrl && (
                      <div style={{ marginTop: 6 }}>
                        <audio controls src={item.audioUrl} style={{ width: "100%" }} />
                      </div>
                    )}
                    {item.hasAudioSubmission && !item.audioUrl && (
                      <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>아직 제출된 음성이 없습니다.</div>
                    )}

                    {item.hasVideoSubmission && item.videoUrl && (
                      <div style={{ marginTop: 6 }}>
                        <video controls src={item.videoUrl} style={{ width: "100%", maxHeight: 400, borderRadius: 8 }} />
                      </div>
                    )}
                    {item.hasVideoSubmission && !item.videoUrl && (
                      <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>아직 제출된 영상이 없습니다.</div>
                    )}

                    {item.hasFileSubmission && item.fileUrl && (
                      <div style={{ marginTop: 6 }}>
                        <a href={item.fileUrl} target="_blank" rel="noreferrer">
                          📎 {item.fileFilename || "제출 파일 열기/다운로드"}
                        </a>
                      </div>
                    )}
                    {item.hasFileSubmission && !item.fileUrl && (
                      <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>아직 제출된 파일이 없습니다.</div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <button onClick={handleDayShareLink} style={{ width: "100%", padding: 12, fontSize: 15, marginTop: 8, marginBottom: 8 }}>
              이 날짜로 학부모 공유링크 만들기
            </button>
            {dayShareMsg && <p style={{ fontSize: 13 }}>{dayShareMsg}</p>}
            {dayShareUrl && (
              <input readOnly value={dayShareUrl} onFocus={(e) => e.target.select()} style={{ ...box, fontSize: 13 }} />
            )}
          </>
        )}
      </div>
    );
  }

  const activeStudents = students.filter((s) => s.studentStatus !== "withdrawn");

  return (
    <div style={{ maxWidth: 480, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>체크리스트 완료 현황</h1>
      {activeStudents.length === 0 ? (
        <p style={{ color: "#888" }}>아직 등록된 학생이 없습니다.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activeStudents.map((s) => {
            const pct = todayProgress[s.studentId] ?? 0;
            return (
              <button
                key={s.studentId}
                onClick={() => openStudent(s.studentId)}
                style={{ textAlign: "left", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{s.name}</span>
                  {s.currentClass && <span style={{ fontSize: 12, color: "#aaa" }}>{s.currentClass.name}</span>}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: pct >= 100 ? "#22b573" : pct > 0 ? "#2f6feb" : "#bbb",
                  }}
                >
                  오늘 {pct}% ›
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
