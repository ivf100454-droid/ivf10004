"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "../BottomNav";
import { colors, fontFamily } from "../theme";

type AssignedItem = { assignedItemId: string; title: string; completed: boolean };
type Assignment = { assignmentId: string; items: AssignedItem[] };
type TodayData = { assignments: Assignment[]; progress: number };

export default function CompletePage() {
  const [data, setData] = useState<TodayData | null>(null);

  useEffect(() => {
    fetch("/api/student/today")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, []);

  const allItems = data ? data.assignments.flatMap((a) => a.items) : [];
  const doneCount = allItems.filter((i) => i.completed).length;
  const allDone = allItems.length > 0 && doneCount >= allItems.length;

  return (
    <div style={{ fontFamily, minHeight: "100vh", background: colors.bg, paddingBottom: 90 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 8, fontSize: 18, fontWeight: 800, color: colors.navy }}>
          {allDone ? "오늘의 학습 완료!" : "오늘의 학습 진행중"}
        </div>

        <div style={{ textAlign: "center", margin: "20px 0" }}>
          <div style={{ fontSize: 64 }}>{allDone ? "🐻" : "🐻"}</div>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              border: `10px solid ${colors.greenLight}`,
              borderTopColor: colors.green,
              margin: "16px auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
              color: colors.green,
            }}
          >
            {data?.progress ?? 0}%
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.navy, marginTop: 8 }}>
            {allDone ? "정말 잘했어요! 오늘 모든 학습을 완료했어요! 🎉" : "조금만 더 하면 완료예요! 계속 화이팅! 💪"}
          </div>
          <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6 }}>
            매일 조금씩, 꾸준히하면 놀라운 성장을 할 수 있어요 💪
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, background: colors.card, borderRadius: 16, padding: 16, textAlign: "center", boxShadow: "0 2px 10px rgba(21,42,84,0.05)" }}>
            <div style={{ fontSize: 20 }}>🗓️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: colors.navy, marginTop: 4 }}>
              {doneCount} / {allItems.length}
            </div>
            <div style={{ fontSize: 11, color: colors.textSecondary }}>완료한 과제</div>
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 800, color: colors.navy, marginBottom: 10 }}>✅ 오늘 완료한 과제</div>
        {allItems
          .filter((i) => i.completed)
          .map((item) => (
            <div
              key={item.assignedItemId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: colors.card,
                borderRadius: 14,
                padding: "12px 16px",
                marginBottom: 8,
                boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
              }}
            >
              <span style={{ fontSize: 14, color: colors.navy, fontWeight: 600 }}>{item.title}</span>
              <span style={{ color: colors.green, fontSize: 16 }}>✅ 완료</span>
            </div>
          ))}

        <Link
          href="/student"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 16,
            padding: 14,
            borderRadius: 14,
            background: colors.blueGradient,
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          홈으로 돌아가기
        </Link>

        <div
          style={{
            marginTop: 20,
            background: colors.greenLight,
            borderRadius: 16,
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22 }}>🏆</span>
          <div style={{ fontSize: 13, color: colors.navy }}>
            <b>내일도 화이팅!</b>
            <br />
            꾸준한 노력은 반드시 실력으로 이어집니다.
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
