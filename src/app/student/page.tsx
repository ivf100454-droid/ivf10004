"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "./BottomNav";
import { colors, fontFamily, getItemVisual } from "./theme";

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
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
  hasFileSubmission: boolean;
  completed: boolean;
};
type Assignment = { assignmentId: string; items: AssignedItem[] };
type TodayData = {
  studentName: string;
  className: string | null;
  assignments: Assignment[];
  progress: number;
  streak: number;
  earnedScore: number;
  maxScore: number;
};

function statusLabel(item: AssignedItem) {
  if (item.completed) return { text: "완료", tone: "done" as const };
  if (item.hasPhotoSubmission || item.hasAudioSubmission || item.hasVideoSubmission || item.hasFileSubmission) {
    return { text: "제출하기", tone: "todo" as const };
  }
  return { text: "시작하기", tone: "todo" as const };
}

export default function StudentPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginMsg, setLoginMsg] = useState("");
  const [data, setData] = useState<TodayData | null>(null);

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
      await loadToday();
    } else {
      const d = await res.json().catch(() => ({}));
      setLoginMsg(d.error || "로그인 실패");
    }
  }

  if (checking) {
    return (
      <div style={{ fontFamily, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: colors.textSecondary }}>
        불러오는 중...
      </div>
    );
  }

  // ---------- 로그인 화면 ----------
  if (!loggedIn) {
    return (
      <div style={{ fontFamily, minHeight: "100vh", background: "#F8FAFF", display: "flex", flexDirection: "column" }}>
        <div style={{ maxWidth: 420, margin: "0 auto", width: "100%", padding: "56px 24px 24px", boxSizing: "border-box", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: colors.blueGradient,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 22,
                margin: "0 auto 14px",
                boxShadow: "0 10px 24px rgba(47,111,235,0.35)",
              }}
            >
              B
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: colors.navy, letterSpacing: -0.5 }}>BOSTON</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: colors.blue, letterSpacing: -0.5, marginTop: -4 }}>ENGLISH</div>
            <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 10 }}>매일 조금씩, 영어가 내 것이 되는 시간 ✨</div>
          </div>

          <div style={{ textAlign: "center", fontSize: 64, marginBottom: 24 }}>🐻</div>

          <div
            style={{
              background: colors.card,
              borderRadius: 22,
              padding: 24,
              boxShadow: "0 12px 30px rgba(21,42,84,0.08)",
            }}
          >
            <h1 style={{ fontSize: 20, fontWeight: 800, color: colors.navy, margin: "0 0 4px" }}>로그인</h1>
            <p style={{ fontSize: 13, color: colors.textSecondary, margin: "0 0 20px" }}>보스턴영어 학생 계정으로 로그인하세요.</p>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                placeholder="아이디를 입력하세요"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                style={{
                  padding: "14px 16px",
                  fontSize: 15,
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  background: colors.bg,
                  boxSizing: "border-box",
                }}
              />
              <div style={{ position: "relative" }}>
                <input
                  placeholder="비밀번호를 입력하세요"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    padding: "14px 16px",
                    fontSize: 15,
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    background: colors.bg,
                    boxSizing: "border-box",
                    width: "100%",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: colors.textMuted, fontSize: 13 }}
                >
                  {showPw ? "숨기기" : "보기"}
                </button>
              </div>
              <button
                type="submit"
                style={{
                  marginTop: 6,
                  padding: 15,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff",
                  background: colors.blueGradient,
                  border: "none",
                  borderRadius: 12,
                  boxShadow: "0 10px 20px rgba(47,111,235,0.3)",
                }}
              >
                로그인
              </button>
            </form>
            {loginMsg && <p style={{ color: colors.pink, textAlign: "center", marginTop: 10, fontSize: 13 }}>{loginMsg}</p>}
            <p style={{ fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 18 }}>
              아이디·비밀번호를 모르면 선생님께 문의하세요
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------- 홈 화면 ----------
  const allItems = data ? data.assignments.flatMap((a) => a.items) : [];
  const total = allItems.length;
  const doneCount = allItems.filter((i) => i.completed).length;
  const previewItems = allItems.slice(0, 5);

  return (
    <div style={{ fontFamily, minHeight: "100vh", background: colors.bg, paddingBottom: 90 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: colors.navy }}>BOSTON</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: colors.blue, marginTop: -4 }}>ENGLISH</div>
          </div>
          <span style={{ fontSize: 20 }}>🔔</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: colors.blueLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
            }}
          >
            🐻
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.navy }}>{data?.studentName} 👋</div>
            {data?.className && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  color: colors.blue,
                  background: colors.blueLight,
                  borderRadius: 999,
                  padding: "3px 10px",
                }}
              >
                {data.className}
              </span>
            )}
          </div>
        </div>

        {!!data?.streak && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: colors.orangeLight,
              color: "#B5690B",
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 999,
              padding: "6px 12px",
              marginBottom: 14,
            }}
          >
            🔥 {data.streak}일 연속 학습중!
          </div>
        )}

        <div
          style={{
            background: colors.blueGradient,
            borderRadius: 20,
            padding: 22,
            color: "#fff",
            marginBottom: 22,
            boxShadow: "0 14px 28px rgba(47,111,235,0.3)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>오늘의 진행률 ⭐</div>
              <div style={{ fontSize: 30, fontWeight: 800 }}>
                {doneCount} / {total} <span style={{ fontSize: 15, fontWeight: 600 }}>완료</span>
              </div>
            </div>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: "5px solid rgba(255,255,255,0.35)",
                borderTopColor: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              {data?.progress ?? 0}%
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 14 }}>
            {allItems.map((it) => (
              <div
                key={it.assignedItemId}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 4,
                  background: it.completed ? "#fff" : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 13, marginTop: 12, opacity: 0.95 }}>
            {total === 0
              ? "선생님이 오늘 체크리스트를 배정하면 여기에 나타나요."
              : doneCount >= total
              ? "오늘 학습을 모두 끝냈어요! 최고예요 🎉"
              : "조금만 더 하면 오늘 공부 끝! 화이팅! 💪"}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: colors.navy, display: "flex", alignItems: "center", gap: 6 }}>
            🗓️ 오늘의 체크리스트
          </div>
          <Link href="/student/checklist" style={{ fontSize: 13, color: colors.textSecondary, textDecoration: "none" }}>
            전체 보기 ›
          </Link>
        </div>

        {previewItems.length === 0 && (
          <div style={{ background: colors.card, borderRadius: 16, padding: 24, textAlign: "center", color: colors.textSecondary, fontSize: 14 }}>
            아직 배정된 체크리스트가 없어요.
            <br />
            선생님께 문의해주세요.
          </div>
        )}

        {previewItems.map((item, idx) => {
          const visual = getItemVisual(item);
          const status = statusLabel(item);
          return (
            <Link
              key={item.assignedItemId}
              href={`/student/item/${item.assignedItemId}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: colors.card,
                borderRadius: 16,
                padding: "14px 16px",
                marginBottom: 10,
                textDecoration: "none",
                color: "inherit",
                boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: colors.blueLight,
                  color: colors.blue,
                  fontSize: 12,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: visual.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {visual.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: colors.navy }}>{item.title}</div>
                {item.hasCount && (
                  <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    🔁 {item.currentCount} / {item.targetCount}회
                  </div>
                )}
                {item.hasScore && (
                  <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {item.score ?? "-"} / {item.maxScore}점
                  </div>
                )}
              </div>
              {status.tone === "done" ? (
                <span style={{ color: colors.green, fontSize: 20 }}>✅</span>
              ) : (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: colors.blue,
                    border: `1px solid ${colors.blue}`,
                    borderRadius: 999,
                    padding: "6px 12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {status.text}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
