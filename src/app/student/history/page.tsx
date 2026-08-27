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
type DayDetailItem = {
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
  photoUrl: string | null;
  photoMimeType: string | null;
  photoFilename: string | null;
  audioUrl: string | null;
  audioFilename: string | null;
  videoUrl: string | null;
  videoFilename: string | null;
  fileUrl: string | null;
  fileMimeType: string | null;
  fileFilename: string | null;
};
type DayDetail = {
  date: string;
  isToday: boolean;
  progress: number;
  assignments: { assignmentId: string; instruction: string | null; reopenedForEditing: boolean; items: DayDetailItem[] }[];
};
type CalendarDay = { day: number; progress: number };
type HistoryData = {
  year: number;
  month: number;
  days: CalendarDay[];
  monthSummary: { completedCount: number; totalCount: number; avgScorePct: number | null };
  dailyRecords: DailyRecord[];
};

const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_NAMES = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = dayLabels[d.getUTCDay()];
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${dow})`;
}

function pad2(n: number) {
  return n < 10 ? "0" + n : String(n);
}

export default function HistoryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<HistoryData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [dayDetailLoading, setDayDetailLoading] = useState(false);

  async function load(y: number, m: number) {
    const res = await fetch(`/api/student/history?year=${y}&month=${m}`);
    if (!res.ok) return;
    const d: HistoryData = await res.json();
    setData(d);
    setSelectedDate(null);
  }

  useEffect(() => {
    load(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  function navMonth(delta: number) {
    let y = year;
    let m = month + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setYear(y);
    setMonth(m);
  }

  const progressByDay: Record<number, number> = {};
  (data?.days || []).forEach((d) => {
    progressByDay[d.day] = d.progress;
  });

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function openDay(d: number) {
    const dateStr = `${year}-${pad2(month)}-${pad2(d)}`;
    setSelectedDate((prev) => {
      const next = prev === dateStr ? null : dateStr;
      if (next) {
        setDayDetailLoading(true);
        setDayDetail(null);
        fetch(`/api/student/day?date=${next}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            setDayDetail(d);
            setDayDetailLoading(false);
          });
      } else {
        setDayDetail(null);
      }
      return next;
    });
  }

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
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.textSecondary }}>
                {year}년 {MONTH_NAMES[month - 1]} 학습 요약
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {year}-{pad2(month)}-01 ~ {year}-{pad2(month)}-{pad2(daysInMonth)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 18 }}>📅</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: colors.navy, marginTop: 4 }}>
                {data?.monthSummary.completedCount ?? 0} / {data?.monthSummary.totalCount ?? 0}
              </div>
              <div style={{ fontSize: 11, color: colors.textSecondary }}>완료한 과제</div>
            </div>
            <div>
              <div style={{ fontSize: 18 }}>🎯</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: colors.navy, marginTop: 4 }}>
                {data?.monthSummary.avgScorePct != null ? `${data.monthSummary.avgScorePct}%` : "-"}
              </div>
              <div style={{ fontSize: 11, color: colors.textSecondary }}>평균 점수</div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: colors.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <button
              onClick={() => navMonth(-1)}
              style={{ padding: "6px 12px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, cursor: "pointer" }}
            >
              ‹
            </button>
            <span style={{ fontSize: 15, fontWeight: 800, color: colors.navy }}>
              {year}년 {MONTH_NAMES[month - 1]}
            </span>
            <button
              onClick={() => navMonth(1)}
              style={{ padding: "6px 12px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, cursor: "pointer" }}
            >
              ›
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {dayLabels.map((lbl) => (
              <div key={lbl} style={{ textAlign: "center", fontSize: 11, color: colors.textMuted, padding: "2px 0" }}>
                {lbl}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {cells.map((d, i) => {
              const progress = d ? progressByDay[d] : undefined;
              const hasData = progress !== undefined;
              const dateStr = d ? `${year}-${pad2(month)}-${pad2(d)}` : "";
              const isSelected = d !== null && selectedDate === dateStr;
              return (
                <button
                  key={i}
                  onClick={() => d && openDay(d)}
                  disabled={!d}
                  style={{
                    aspectRatio: "1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    border: isSelected ? `2px solid ${colors.blue}` : "none",
                    cursor: d ? "pointer" : "default",
                    background: hasData ? colors.blueGradient : "transparent",
                    color: hasData ? "#fff" : colors.navy,
                  }}
                >
                  {d ? (
                    hasData ? (
                      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.1 }}>{progress}%</span>
                    ) : (
                      <span style={{ fontSize: 13 }}>{d}</span>
                    )
                  ) : (
                    ""
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedDate && (
          <button
            onClick={() => setSelectedDate(null)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              fontSize: 13,
              color: colors.blue,
              background: colors.blueLight,
              border: "none",
              borderRadius: 10,
              padding: 10,
              marginBottom: 12,
              cursor: "pointer",
            }}
          >
            선택 해제하고 이번 달 전체 보기
          </button>
        )}

        {visibleRecords.length === 0 && (
          <div style={{ background: colors.card, borderRadius: 16, padding: 24, textAlign: "center", color: colors.textSecondary, fontSize: 14 }}>
            {selectedDate ? "이 날은 학습 기록이 없어요." : "이번 달 학습 기록이 없어요."}
          </div>
        )}

        {!selectedDate &&
          visibleRecords.map((rec) => (
            <div key={rec.date} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.navy }}>{formatDateLabel(rec.date)}</div>
                <div style={{ fontSize: 12, color: colors.textSecondary }}>{rec.completedCount}개 완료</div>
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

        {selectedDate && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.navy, marginBottom: 8 }}>
              {formatDateLabel(selectedDate)}
            </div>

            {dayDetailLoading && <p style={{ color: colors.textSecondary, fontSize: 13 }}>불러오는 중...</p>}

            {!dayDetailLoading &&
              dayDetail?.assignments.map((a) => (
                <div key={a.assignmentId} style={{ marginBottom: 14 }}>
                  {a.reopenedForEditing && (
                    <div
                      style={{
                        background: "#fff7e6",
                        border: "1px solid #f0b429",
                        borderRadius: 10,
                        padding: 10,
                        marginBottom: 8,
                        fontSize: 12,
                        color: colors.navy,
                      }}
                    >
                      🔓 선생님이 이 날짜 기록을 다시 열어주셨어요 — 지금 다시 체크하거나 제출할 수 있어요.
                    </div>
                  )}
                  {a.instruction && (
                    <div
                      style={{
                        background: colors.blueLight,
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 8,
                        fontSize: 13,
                        color: colors.navy,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      📢 {a.instruction}
                    </div>
                  )}
                  {a.items.map((item) => (
                    <div
                      key={item.assignedItemId}
                      style={{
                        background: colors.card,
                        borderRadius: 14,
                        padding: "14px 16px",
                        marginBottom: 8,
                        boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>{item.title}</div>
                        {item.completed ? (
                          <span style={{ color: colors.green, fontSize: 13, fontWeight: 700 }}>✅ 완료</span>
                        ) : (
                          <span style={{ color: colors.textMuted, fontSize: 13, fontWeight: 700 }}>미완료</span>
                        )}
                      </div>
                      {item.hasScore && item.maxScore != null && (
                        <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                          {item.score ?? "-"} / {item.maxScore}점
                        </div>
                      )}
                      {item.hasCount && (
                        <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                          {item.currentCount} / {item.targetCount}회
                        </div>
                      )}

                      {item.hasPhotoSubmission && item.photoUrl && (
                        <div style={{ marginTop: 6 }}>
                          {item.photoMimeType === "application/pdf" ? (
                            <a href={item.photoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: colors.blue }}>
                              📄 {item.photoFilename || "제출 PDF 보기"}
                            </a>
                          ) : (
                            <img src={item.photoUrl} alt="제출 사진" style={{ maxWidth: "100%", borderRadius: 10 }} />
                          )}
                        </div>
                      )}
                      {item.hasAudioSubmission && item.audioUrl && (
                        <div style={{ marginTop: 6 }}>
                          <audio controls src={item.audioUrl} style={{ width: "100%" }} />
                        </div>
                      )}
                      {item.hasVideoSubmission && item.videoUrl && (
                        <div style={{ marginTop: 6 }}>
                          <video controls src={item.videoUrl} style={{ width: "100%", maxHeight: 320, borderRadius: 10 }} />
                        </div>
                      )}
                      {item.hasFileSubmission && item.fileUrl && (
                        <div style={{ marginTop: 6 }}>
                          <a href={item.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: colors.blue }}>
                            📎 {item.fileFilename || "제출 파일 열기"}
                          </a>
                        </div>
                      )}
                      {a.reopenedForEditing && (
                        <Link
                          href={`/student/item/${item.assignedItemId}`}
                          style={{
                            display: "inline-block",
                            marginTop: 10,
                            fontSize: 13,
                            fontWeight: 700,
                            color: colors.blue,
                            border: `1px solid ${colors.blue}`,
                            borderRadius: 999,
                            padding: "6px 14px",
                            textDecoration: "none",
                          }}
                        >
                          다시 체크/제출하러 가기
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
