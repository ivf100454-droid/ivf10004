"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "../BottomNav";
import { colors, fontFamily } from "../theme";

type DailyItem = {
  assignedItemId: string;
  title: string;
  completed: boolean;
  hasScore: boolean;
  score: number | null;
  maxScore: number | null;
  hasCount: boolean;
  currentCount: number;
  targetCount: number | null;
};
type DailyRecord = {
  date: string;
  totalCount: number;
  completedCount: number;
  progress: number;
  avgScorePct: number | null;
  items: DailyItem[];
};
type WeekStripDay = { date: string; allDone: boolean; hasData: boolean };
type HistoryData = {
  weekStrip: WeekStripDay[];
  weekSummary: { completedCount: number; totalCount: number; avgScorePct: number | null };
  dailyRecords: DailyRecord[];
};

const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = dayLabels[d.getUTCDay()];
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${dow})`;
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/student/history?days=14")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: HistoryData | null) => {
        setData(d);
        if (d && d.weekStrip.length) setSelectedDate(d.weekStrip[d.weekStrip.length - 1].date);
      });
  }, []);

  const visibleRecords = selectedDate
    ? data?.dailyRecords.filter((r) => r.date === selectedDate) || []
    : data?.dailyRecords || [];

  return (
    <div style={{ fontFamily, minHeight: "100vh", background: colors.bg, paddingBottom: 90 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Link href="/student" style={{ fontSize: 20, color: colors.navy, textDecoration: "none" }}>
            ‹
          </Link>
          <div style={{ fontSize: 19, fontWeight: 800, color: colors.navy }}>학습 기록</div>
        </div>

        <div
          style={{
            background: colors.card,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 36 }}>🐻</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>이번 주 학습 요약</div>
              {data && data.weekStrip.length > 0 && (
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {data.weekStrip[0].date} ~ {data.weekStrip[data.weekStrip.length - 1].date}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 18 }}>📅</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: colors.navy, marginTop: 4 }}>
                {data?.weekSummary.completedCount ?? 0} / {data?.weekSummary.totalCount ?? 0}
              </div>
              <div style={{ fontSize: 11, color: colors.textSecondary }}>완료한 과제</div>
            </div>
            <div>
              <div style={{ fontSize: 18 }}>🎯</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: colors.navy, marginTop: 4 }}>
                {data?.weekSummary.avgScorePct != null ? `${data.weekSummary.avgScorePct}%` : "-"}
              </div>
              <div style={{ fontSize: 11, color: colors.textSecondary }}>평균 점수</div>
            </div>
          </div>
        </div>

        {data && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              background: colors.card,
              borderRadius: 16,
              padding: "14px 8px",
              marginBottom: 16,
              boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
            }}
          >
            {data.weekStrip.map((day) => {
              const d = new Date(day.date + "T00:00:00Z");
              const active = selectedDate === day.date;
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  style={{
                    background: "none",
                    border: "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 6px",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 11, color: colors.textMuted }}>{dayLabels[d.getUTCDay()]}</span>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      background: active ? colors.blue : day.allDone ? colors.greenLight : colors.bg,
                      color: active ? "#fff" : day.allDone ? colors.green : colors.textMuted,
                      border: active ? "none" : `1px solid ${colors.border}`,
                    }}
                  >
                    {day.allDone ? "✓" : d.getUTCDate()}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {visibleRecords.length === 0 && (
          <div style={{ background: colors.card, borderRadius: 16, padding: 24, textAlign: "center", color: colors.textSecondary, fontSize: 14 }}>
            이 날은 학습 기록이 없어요.
          </div>
        )}

        {visibleRecords.map((rec) => (
          <div key={rec.date} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.navy }}>{formatDateLabel(rec.date)}</div>
              <div style={{ fontSize: 12, color: colors.textSecondary }}>
                {rec.completedCount}개 완료
              </div>
            </div>
            {rec.items.map((item) => (
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
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>{item.title}</div>
                  {item.hasScore && item.maxScore != null && (
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {item.score ?? "-"} / {item.maxScore}점
                    </div>
                  )}
                  {item.hasCount && (
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {item.currentCount} / {item.targetCount}회
                    </div>
                  )}
                </div>
                {item.completed ? (
                  <span style={{ color: colors.green, fontSize: 13, fontWeight: 700 }}>✅ 완료</span>
                ) : (
                  <span style={{ color: colors.textMuted, fontSize: 13, fontWeight: 700 }}>미완료</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
