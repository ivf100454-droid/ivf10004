"use client";

import { useEffect, useState } from "react";

type TeachingVideo = { title: string; url: string };

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
  teachingVideo: TeachingVideo | null;
};
type Assignment = { assignmentId: string; items: AssignedItem[] };
type TodayData = {
  studentName: string;
  className: string | null;
  date: string;
  assignments: Assignment[];
  progress: number;
};

function scoreOptions(maxScore: number) {
  const opts: number[] = [];
  for (let v = 10; v <= maxScore; v += 10) opts.push(v);
  return opts;
}

export default function StudentPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [checking, setChecking] = useState(true);

  const [data, setData] = useState<TodayData | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadToday() {
    const res = await fetch("/api/student/today");
    if (res.status === 401) {
      setLoggedIn(false);
      setChecking(false);
      return;
    }
    setLoggedIn(true);
    setChecking(false);
    setData(await res.json());
  }

  useEffect(() => {
    loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginMsg("로그인 중...");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });
    if (res.ok) {
      setLoginMsg("");
      setLoginId("");
      setPassword("");
      await loadToday();
    } else {
      const d = await res.json().catch(() => ({}));
      setLoginMsg(d.error || "로그인 실패");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setLoggedIn(false);
    setData(null);
  }

  async function patchItem(assignedItemId: string, patch: Record<string, unknown>) {
    setSavingId(assignedItemId);
    await fetch("/api/student/assigned-items/" + assignedItemId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await loadToday();
    setSavingId(null);
  }

  const box: React.CSSProperties = { padding: 12, fontSize: 16, width: "100%", boxSizing: "border-box" };

  if (checking) {
    return <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>불러오는 중...</div>;
  }

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 380, margin: "60px auto", padding: 16, fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 22, textAlign: "center", marginBottom: 24 }}>보스턴영어</h1>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} style={box} />
          <input
            placeholder="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={box}
          />
          <button type="submit" style={{ padding: 14, fontSize: 16, background: "#222", color: "#fff", border: "none", borderRadius: 8 }}>
            로그인
          </button>
        </form>
        {loginMsg && <p style={{ color: "crimson", textAlign: "center", marginTop: 8 }}>{loginMsg}</p>}
        <p style={{ fontSize: 13, color: "#888", textAlign: "center", marginTop: 16 }}>
          아이디/비밀번호를 모르면 선생님께 문의하세요
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>{data?.studentName}</h1>
        <button onClick={handleLogout} style={{ fontSize: 12, padding: "6px 10px" }}>
          로그아웃
        </button>
      </div>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
        {data?.className ? data.className + " · " : ""}오늘의 체크리스트
      </p>

      {!data || data.assignments.length === 0 ? (
        <p style={{ color: "#888" }}>아직 배정된 체크리스트가 없습니다. 선생님께 문의하세요.</p>
      ) : (
        <>
          <div style={{ background: "#eee", borderRadius: 8, overflow: "hidden", height: 20, marginBottom: 8 }}>
            <div style={{ width: `${data.progress}%`, background: "#4caf50", height: "100%" }} />
          </div>
          <p style={{ fontSize: 14, marginBottom: 20 }}>오늘 진행률 {data.progress}%</p>

          {data.assignments.map((a) =>
            a.items.map((item) => (
              <div
                key={item.assignedItemId}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 10,
                  background: item.completed ? "#f3fbf3" : "white",
                  opacity: savingId === item.assignedItemId ? 0.6 : 1,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
                  {item.completed ? "✅ " : "⬜ "}
                  {item.title}
                </div>

                {item.hasCheck && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 15 }}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => patchItem(item.assignedItemId, { checked: e.target.checked })}
                      style={{ width: 20, height: 20 }}
                    />
                    체크 완료
                  </label>
                )}

                {item.hasCount && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <button
                      onClick={() => patchItem(item.assignedItemId, { currentCount: Math.max(0, item.currentCount - 1) })}
                      disabled={item.currentCount <= 0}
                      style={{ padding: "6px 14px", fontSize: 16 }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: 15 }}>
                      {item.currentCount} / {item.targetCount}회
                    </span>
                    <button
                      onClick={() => patchItem(item.assignedItemId, { currentCount: item.currentCount + 1 })}
                      style={{ padding: "6px 14px", fontSize: 16 }}
                    >
                      +
                    </button>
                  </div>
                )}

                {item.hasScore && item.maxScore && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <select
                      value={item.score ?? ""}
                      onChange={(e) =>
                        patchItem(item.assignedItemId, { score: e.target.value === "" ? null : Number(e.target.value) })
                      }
                      style={{ padding: 8, fontSize: 15 }}
                    >
                      <option value="">점수 선택</option>
                      {scoreOptions(item.maxScore).map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: 15 }}>/ {item.maxScore}점</span>
                  </div>
                )}

                {item.linkUrl && (
                  <a href={item.linkUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginBottom: 8, fontSize: 14 }}>
                    🔗 {item.linkLabel || "자료 열기"}
                  </a>
                )}

                {item.teachingVideo && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>🎓 {item.teachingVideo.title}</div>
                    <video controls src={item.teachingVideo.url} style={{ width: "100%", maxHeight: 320, borderRadius: 8 }} />
                  </div>
                )}

                {(item.hasPhotoSubmission || item.hasAudioSubmission || item.hasVideoSubmission) && (
                  <p style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                    사진/음성/영상 제출은 준비 중이에요 — 완료되면 여기서 바로 올릴 수 있게 됩니다.
                  </p>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
