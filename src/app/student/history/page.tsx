"use client";

import BottomNav from "../BottomNav";
import { colors, fontFamily } from "../theme";

export default function HistoryPage() {
  return (
    <div style={{ fontFamily, minHeight: "100vh", background: colors.bg, paddingBottom: 90 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: colors.navy, marginBottom: 8 }}>학습 기록</div>
        <div style={{ fontSize: 14, color: colors.textSecondary }}>주간 학습 기록 화면은 곧 만나볼 수 있어요!</div>
      </div>
      <BottomNav />
    </div>
  );
}
