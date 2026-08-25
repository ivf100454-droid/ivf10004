"use client";

import Link from "next/link";
import { colors, fontFamily } from "./student/theme";

export default function LandingPage() {
  return (
    <div
      style={{
        fontFamily,
        minHeight: "100vh",
        background: "#F8FAFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: colors.blueGradient,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 26,
            margin: "0 auto 16px",
            boxShadow: "0 10px 24px rgba(47,111,235,0.35)",
          }}
        >
          B
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: colors.navy, letterSpacing: -0.5 }}>BOSTON</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: colors.blue, letterSpacing: -0.5, marginTop: -4 }}>ENGLISH</div>
        <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 10 }}>매일 조금씩, 영어가 내 것이 되는 시간 ✨</div>
      </div>

      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 14 }}>
        <Link
          href="/student"
          style={{
            display: "block",
            textAlign: "center",
            padding: "18px",
            borderRadius: 16,
            background: colors.blueGradient,
            color: "#fff",
            fontWeight: 700,
            fontSize: 17,
            textDecoration: "none",
            boxShadow: "0 10px 24px rgba(47,111,235,0.3)",
          }}
        >
          🧑‍🎓 학생 로그인
        </Link>
        <Link
          href="/admin-test"
          style={{
            display: "block",
            textAlign: "center",
            padding: "18px",
            borderRadius: 16,
            background: colors.card,
            color: colors.navy,
            fontWeight: 700,
            fontSize: 17,
            textDecoration: "none",
            border: `1px solid ${colors.border}`,
          }}
        >
          🛠️ 관리자 로그인
        </Link>
      </div>
    </div>
  );
}
