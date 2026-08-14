"use client";

import { useEffect, useState } from "react";

type Student = { studentId: string; name: string };
type Template = { templateId: string; name: string; items: { templateItemId: string }[] };

type AssignedItem = {
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
  completed: boolean;
};
type Assignment = { assignmentId: string; items: AssignedItem[] };

export default function ChecklistTestPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [assignMsg, setAssignMsg] = useState("");

  const [viewStudentId, setViewStudentId] = useState("");
  const [todayData, setTodayData] = useState<{ assignments: Assignment[]; progress: number } | null>(
    null
  );

  async function refreshBase() {
    const [sRes, tRes] = await Promise.all([
      fetch("/api/admin/students"),
      fetch("/api/admin/templates"),
    ]);
    if (sRes.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setStudents(await sRes.json());
    setTemplates(await tRes.json());
  }

  useEffect(() => {
    refreshBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadToday(studentId: string) {
    if (!studentId) {
      setTodayData(null);
      return;
    }
    const res = await fetch(`/api/admin/students/${studentId}/today`);
    if (res.ok) setTodayData(await res.json());
  }

  useEffect(() => {
    if (viewStudentId) loadToday(viewStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewStudentId]);

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

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setAssignMsg("");
    if (!selectedStudentId || !selectedTemplateId) {
      setAssignMsg("학생과 템플릿을 모두 선택해주세요.");
      return;
    }
    const res = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: selectedStudentId, templateId: selectedTemplateId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAssignMsg(`배정 완료 (항목 ${data.items.length}개)`);
      if (viewStudentId === selectedStudentId) await loadToday(selectedStudentId);
    } else {
      setAssignMsg(`실패: ${data.error}`);
    }
  }

  async function patchItem(assignedItemId: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/assigned-items/${assignedItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await loadToday(viewStudentId);
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
    <div style={{ maxWidth: 560, margin: "40px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>체크리스트 배정 / 오늘 확인</h1>

      <h2 style={{ fontSize: 16, marginBottom: 8 }}>1. 학생에게 배정</h2>
      <form onSubmit={handleAssign} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} style={box}>
          <option value="">학생 선택</option>
          {students.map((s) => (
            <option key={s.studentId} value={s.studentId}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} style={box}>
          <option value="">템플릿 선택</option>
          {templates.map((t) => (
            <option key={t.templateId} value={t.templateId}>
              {t.name} ({t.items.length}개 항목)
            </option>
          ))}
        </select>
        <button type="submit" style={{ padding: 12, fontSize: 16 }}>
          오늘 날짜로 배정
        </button>
      </form>
      {assignMsg && <p style={{ fontSize: 14 }}>{assignMsg}</p>}

      <h2 style={{ fontSize: 16, marginTop: 28, marginBottom: 8 }}>2. 오늘 체크리스트 보기</h2>
      <select value={viewStudentId} onChange={(e) => setViewStudentId(e.target.value)} style={box}>
        <option value="">학생 선택</option>
        {students.map((s) => (
          <option key={s.studentId} value={s.studentId}>
            {s.name}
          </option>
        ))}
      </select>

      {todayData && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: "#eee", borderRadius: 8, overflow: "hidden", height: 20, marginBottom: 8 }}>
            <div
              style={{
                width: `${todayData.progress}%`,
                background: "#4caf50",
                height: "100%",
                transition: "width 0.2s",
              }}
            />
          </div>
          <p style={{ fontSize: 14, marginBottom: 16 }}>진행률 {todayData.progress}%</p>

          {todayData.assignments.length === 0 && (
            <p style={{ color: "#888" }}>오늘 배정된 체크리스트가 없습니다.</p>
          )}

          {todayData.assignments.map((a) =>
            a.items.map((item) => (
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
                  <label style={{ display: "block", marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => patchItem(item.assignedItemId, { checked: e.target.checked })}
                      style={{ width: 20, height: 20, marginRight: 8 }}
                    />
                    체크 완료
                  </label>
                )}

                {item.hasCount && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <button
                      type="button"
                      onClick={() =>
                        patchItem(item.assignedItemId, { currentCount: item.currentCount - 1 })
                      }
                      disabled={item.currentCount <= 0}
                      style={{ padding: "4px 12px" }}
                    >
                      -
                    </button>
                    <span>
                      {item.currentCount} / {item.targetCount}회
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        patchItem(item.assignedItemId, { currentCount: item.currentCount + 1 })
                      }
                      style={{ padding: "4px 12px" }}
                    >
                      +
                    </button>
                  </div>
                )}

                {item.hasScore && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <input
                      type="number"
                      placeholder="점수"
                      defaultValue={item.score ?? ""}
                      onBlur={(e) =>
                        patchItem(item.assignedItemId, {
                          score: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      style={{ width: 80, padding: 6 }}
                    />
                    <span>/ {item.maxScore}점</span>
                  </div>
                )}

                {item.linkUrl && (
                  
                    href={item.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "inline-block", marginBottom: 6 }}
                  >
                    🔗 {item.linkLabel || "자료 열기"}
                  </a>
                )}

                {(item.hasPhotoSubmission || item.hasAudioSubmission || item.hasVideoSubmission) && (
                  <div style={{ fontSize: 13, color: "#aa6600", marginTop: 4 }}>
                    {item.hasPhotoSubmission && "📷 사진제출 "}
                    {item.hasAudioSubmission && "🎤 음성제출 "}
                    {item.hasVideoSubmission && "🎬 영상제출 "}
                    — 업로드 기능은 다음 배치에서 지원 예정 (아직 제출 불가)
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
