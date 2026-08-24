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

  return (
    <div style={{ fontFamily, minHeight: "100vh", background: colors.bg, paddingBottom: 90 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>🐻</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: colors.navy, marginTop: 8 }}>{data?.studentName}</div>
          {data?.className && <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{data.className}</div>}
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
      </div>
      <BottomNav />
    </div>
  );
}
