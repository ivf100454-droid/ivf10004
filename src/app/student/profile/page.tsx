"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "../BottomNav";
import { colors, fontFamily } from "../theme";

type TodayData = { studentName: string; className: string | null };

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<TodayData | null>(null);

  useEffect(() => {
    fetch("/api/student/today")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/student");
    router.refresh();
  }

  const menu = [
    { icon: "🔒", label: "비밀번호 변경", note: "선생님께 문의해주세요" },
    { icon: "🔔", label: "알림 설정", note: "준비중" },
    { icon: "❓", label: "도움말", note: "선생님께 문의해주세요" },
  ];

  return (
    <div style={{ fontFamily, minHeight: "100vh", background: colors.bg, paddingBottom: 90 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: colors.navy, marginBottom: 18 }}>내 정보</div>

        <div
          style={{
            background: colors.blueGradient,
            borderRadius: 20,
            padding: 24,
            marginBottom: 18,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 14px 28px rgba(47,111,235,0.3)",
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              flexShrink: 0,
            }}
          >
            🐻
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{data?.studentName ?? "학생"}</div>
            {data?.className && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.25)",
                  borderRadius: 999,
                  padding: "3px 10px",
                }}
              >
                {data.className}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            background: colors.card,
            borderRadius: 18,
            overflow: "hidden",
            marginBottom: 18,
            boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
          }}
        >
          {menu.map((m, idx) => (
            <div
              key={m.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 18px",
                borderBottom: idx < menu.length - 1 ? `1px solid ${colors.border}` : "none",
              }}
            >
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: colors.navy }}>{m.label}</span>
              <span style={{ fontSize: 12, color: colors.textMuted }}>{m.note}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            background: colors.card,
            color: colors.pink,
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          로그아웃
        </button>

        <div style={{ textAlign: "center", fontSize: 11, color: colors.textMuted, marginTop: 20 }}>
          BOSTON ENGLISH · 매일 조금씩, 영어가 내 것이 되는 시간 ✨
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
