"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { colors, fontFamily } from "./theme";

const cards = [
  { href: "/admin-test/classes", icon: "🏫", title: "수업 관리", desc: "반을 만들고 관리해요" },
  { href: "/admin-test/students", icon: "🧑‍🎓", title: "학생 관리", desc: "학생 등록·아이디·수업 배치" },
  { href: "/admin-test/activities", icon: "🧩", title: "활동 관리", desc: "체크리스트에 담을 활동 만들기" },
  { href: "/admin-test/template-builder", icon: "📋", title: "템플릿 관리", desc: "활동을 모아 템플릿으로 조립" },
  { href: "/admin-test/checklist", icon: "✅", title: "체크리스트 배정", desc: "학생에게 오늘 배정·확인" },
  { href: "/admin-test/status", icon: "📅", title: "완료 현황", desc: "날짜별 완료 상태 확인" },
  { href: "/admin-test/teaching-videos", icon: "🎬", title: "학습영상 관리", desc: "학습용 영상 자료 업로드" },
];

export default function AdminHomePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  async function checkLogin() {
    const res = await fetch("/api/admin/students");
    setLoggedIn(res.status !== 401);
    setChecking(false);
  }

  useEffect(() => {
    checkLogin();
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
      await checkLogin();
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

  if (!loggedIn) {
    return (
      <div style={{ fontFamily, minHeight: "100vh", background: "#F8FAFF", display: "flex", flexDirection: "column" }}>
        <div style={{ maxWidth: 420, margin: "0 auto", width: "100%", padding: "72px 24px 24px", boxSizing: "border-box" }}>
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
            <div style={{ fontSize: 26, fontWeight: 800, color: colors.navy, letterSpacing: -0.5 }}>BOSTON ENGLISH</div>
            <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>관리자 페이지</div>
          </div>

          <div
            style={{
              background: colors.card,
              borderRadius: 22,
              padding: 24,
              boxShadow: "0 12px 30px rgba(21,42,84,0.08)",
            }}
          >
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                placeholder="아이디"
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
              <input
                placeholder="비밀번호"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: "14px 16px",
                  fontSize: 15,
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  background: colors.bg,
                  boxSizing: "border-box",
                }}
              />
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: colors.navy, marginBottom: 4 }}>안녕하세요 👋</div>
        <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 28 }}>
          오늘도 보스턴영어 관리자 페이지에 오신 걸 환영해요.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              style={{
                display: "block",
                background: colors.card,
                borderRadius: 18,
                padding: 22,
                textDecoration: "none",
                color: "inherit",
                boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
                transition: "box-shadow 0.15s",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: colors.blueLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  marginBottom: 14,
                }}
              >
                {c.icon}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: colors.navy, marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: colors.textSecondary }}>{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>
  );
}
