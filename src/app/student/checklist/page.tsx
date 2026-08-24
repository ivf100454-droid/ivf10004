"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "../BottomNav";
import { colors, fontFamily, getItemVisual, isSubmissionItem } from "../theme";

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
type TodayData = { assignments: Assignment[]; progress: number };

type TabKey = "all" | "learn" | "submit" | "practice";

export default function ChecklistPage() {
  const [data, setData] = useState<TodayData | null>(null);
  const [tab, setTab] = useState<TabKey>("all");

  useEffect(() => {
    fetch("/api/student/today")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, []);

  const allItems = data ? data.assignments.flatMap((a) => a.items) : [];
  const learnItems = allItems.filter((i) => !isSubmissionItem(i) && !(i.hasCount && !i.hasCheck && !i.hasScore));
  const submitItems = allItems.filter((i) => isSubmissionItem(i));
  const practiceItems = allItems.filter((i) => i.hasCount && !i.hasCheck && !i.hasScore && !isSubmissionItem(i));

  const tabs: { key: TabKey; label: string; items: AssignedItem[] }[] = [
    { key: "all", label: `전체 (${allItems.length})`, items: allItems },
    { key: "learn", label: `학습 (${learnItems.length})`, items: learnItems },
    { key: "submit", label: `제출 (${submitItems.length})`, items: submitItems },
    { key: "practice", label: `연습 (${practiceItems.length})`, items: practiceItems },
  ];
  const activeItems = tabs.find((t) => t.key === tab)!.items;
  const doneCount = allItems.filter((i) => i.completed).length;

  return (
    <div style={{ fontFamily, minHeight: "100vh", background: colors.bg, paddingBottom: 90 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Link href="/student" style={{ fontSize: 20, color: colors.navy, textDecoration: "none" }}>
            ‹
          </Link>
          <div style={{ fontSize: 19, fontWeight: 800, color: colors.navy }}>오늘의 체크리스트</div>
        </div>

        <div
          style={{
            background: colors.card,
            borderRadius: 18,
            padding: 18,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
          }}
        >
          <div style={{ fontSize: 34 }}>🐻</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>오늘의 진행률</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colors.blue }}>
              {doneCount} / {allItems.length} 완료
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              {allItems.length > 0 && doneCount >= allItems.length ? "정말 잘하고 있어요! 💪" : "하나씩 차근차근 해봐요!"}
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: colors.blue }}>{data?.progress ?? 0}%</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flexShrink: 0,
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: tab === t.key ? colors.blue : colors.card,
                color: tab === t.key ? "#fff" : colors.textSecondary,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeItems.length === 0 && (
          <div style={{ background: colors.card, borderRadius: 16, padding: 24, textAlign: "center", color: colors.textSecondary, fontSize: 14 }}>
            이 탭에는 항목이 없어요.
          </div>
        )}

        {activeItems.map((item, idx) => {
          const visual = getItemVisual(item);
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
              {item.completed ? (
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
                  {isSubmissionItem(item) ? "제출하기" : "시작하기"}
                </span>
              )}
            </Link>
          );
        })}

        {allItems.length > 0 && doneCount >= allItems.length && (
          <Link
            href="/student/complete"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 10,
              padding: 14,
              borderRadius: 14,
              background: colors.green,
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            🎉 오늘 학습 완료 확인하기
          </Link>
        )}

        <div
          style={{
            marginTop: 20,
            background: colors.blueLight,
            borderRadius: 16,
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22 }}>💡</span>
          <div style={{ fontSize: 13, color: colors.navy }}>
            <b>오늘의 미션 팁!</b>
            <br />
            하나씩 차근차근 완료하면 어느새 100% 완료! 화이팅 💪
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
