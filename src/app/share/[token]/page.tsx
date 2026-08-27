"use client";

import { useEffect, useState } from "react";

type SharedItem = {
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
  linkUrl: string | null;
  linkLabel: string | null;
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
type SharedAssignment = { assignmentId: string; instruction: string | null; items: SharedItem[] };
type SharedDay = { date: string; progress: number; hasRecord: boolean; assignments: SharedAssignment[] };
type SharedData = {
  studentName: string;
  rangeDays: number;
  startDate: string;
  endDate: string;
  overallProgress: number;
  days: SharedDay[];
};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00.000Z");
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const w = WEEKDAY_LABELS[d.getUTCDay()];
  return `${m}/${day} (${w})`;
}

function ItemCard({ item }: { item: SharedItem }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        background: item.completed ? "#f3fbf3" : "white",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        {item.completed ? "✅ " : "⬜ "}
        {item.title}
      </div>

      {item.hasCheck && (
        <div style={{ marginBottom: 6, fontSize: 14 }}>체크: {item.checked ? "완료" : "미완료"}</div>
      )}

      {item.hasCount && (
        <div style={{ marginBottom: 6, fontSize: 14 }}>
          {item.currentCount} / {item.targetCount}회
        </div>
      )}

      {item.hasScore && (
        <div style={{ marginBottom: 6, fontSize: 14 }}>
          점수: {item.score != null ? item.score : "-"} / {item.maxScore}점
        </div>
      )}

      {item.linkUrl && (
        <a href={item.linkUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginBottom: 6 }}>
          🔗 {item.linkLabel || "자료 열기"}
        </a>
      )}

      {item.hasPhotoSubmission && item.photoUrl && (
        <div style={{ marginTop: 6 }}>
          {item.photoMimeType === "application/pdf" ? (
            <iframe
              src={item.photoUrl}
              title={item.photoFilename || "제출 PDF"}
              style={{ width: "100%", height: 400, border: "1px solid #ddd", borderRadius: 8 }}
            />
          ) : (
            <img src={item.photoUrl} alt="제출 사진" style={{ maxWidth: "100%", borderRadius: 8 }} />
          )}
        </div>
      )}
      {item.hasPhotoSubmission && !item.photoUrl && (
        <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>아직 제출된 파일이 없습니다.</div>
      )}

      {item.hasAudioSubmission && item.audioUrl && (
        <div style={{ marginTop: 6 }}>
          <audio controls src={item.audioUrl} style={{ width: "100%" }} />
        </div>
      )}
      {item.hasAudioSubmission && !item.audioUrl && (
        <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>아직 제출된 음성이 없습니다.</div>
      )}

      {item.hasVideoSubmission && item.videoUrl && (
        <div style={{ marginTop: 6 }}>
          <video controls src={item.videoUrl} style={{ width: "100%", maxHeight: 400, borderRadius: 8 }} />
        </div>
      )}
      {item.hasVideoSubmission && !item.videoUrl && (
        <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>아직 제출된 영상이 없습니다.</div>
      )}

      {item.hasFileSubmission && item.fileUrl && (
        <div style={{ marginTop: 6 }}>
          <a href={item.fileUrl} target="_blank" rel="noreferrer">
            📎 {item.fileFilename || "제출 파일 열기/다운로드"}
          </a>
        </div>
      )}
      {item.hasFileSubmission && !item.fileUrl && (
        <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>아직 제출된 파일이 없습니다.</div>
      )}
    </div>
  );
}

export default function SharePage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState("");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/share/" + params.token)
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (result) {
        if (result.ok) {
          setData(result.body);
          if (result.body.rangeDays === 1 && result.body.days[0]) {
            setExpandedDate(result.body.days[0].date);
          }
        } else {
          setError(result.body.error || "링크를 불러올 수 없습니다.");
        }
      })
      .catch(function () {
        setError("링크를 불러올 수 없습니다.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: "60px auto", padding: 16, fontFamily: "sans-serif", textAlign: "center" }}>
        <p style={{ color: "crimson", fontSize: 15 }}>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ maxWidth: 480, margin: "60px auto", padding: 16, fontFamily: "sans-serif", textAlign: "center" }}>
        <p style={{ color: "#888" }}>불러오는 중...</p>
      </div>
    );
  }

  const isWeekly = data.rangeDays > 1;
  const recordedDays = data.days.filter((d) => d.hasRecord).length;

  return (
    <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{data.studentName} 학생의 학습 기록</h1>
      <p style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>
        {isWeekly ? `${data.startDate} ~ ${data.endDate} (일주일 요약)` : data.startDate}
      </p>

      <div style={{ background: "#eee", borderRadius: 8, overflow: "hidden", height: 20, marginBottom: 8 }}>
        <div style={{ width: data.overallProgress + "%", background: "#4caf50", height: "100%" }} />
      </div>
      <p style={{ fontSize: 14, marginBottom: isWeekly ? 4 : 16 }}>전체 진행률 {data.overallProgress}%</p>
      {isWeekly && (
        <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
          이번 주 7일 중 학습 기록이 있는 날: {recordedDays}일
        </p>
      )}

      {isWeekly && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {data.days.map((day) => (
            <button
              key={day.date}
              onClick={() => setExpandedDate(expandedDate === day.date ? null : day.date)}
              style={{
                flex: "1 1 auto",
                minWidth: 62,
                padding: "8px 4px",
                borderRadius: 8,
                border: expandedDate === day.date ? "2px solid #4caf50" : "1px solid #ddd",
                background: day.hasRecord ? (day.progress >= 100 ? "#e7f8ee" : "#fff") : "#f5f5f5",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "#888" }}>{formatDayLabel(day.date)}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: day.hasRecord ? "#333" : "#bbb" }}>
                {day.hasRecord ? `${day.progress}%` : "-"}
              </div>
            </button>
          ))}
        </div>
      )}

      {data.days
        .filter((day) => (isWeekly ? expandedDate === day.date : true))
        .map((day) => (
          <div key={day.date} style={{ marginBottom: 20 }}>
            {isWeekly && (
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#333" }}>
                {formatDayLabel(day.date)} · 진행률 {day.progress}%
              </div>
            )}
            {day.assignments.length === 0 && (
              <p style={{ color: "#888", fontSize: 13 }}>이 날은 배정된 체크리스트가 없습니다.</p>
            )}
            {day.assignments.map((a) => (
              <div key={a.assignmentId}>
                {a.instruction && (
                  <div
                    style={{
                      background: "#eef4ff",
                      borderRadius: 8,
                      padding: 10,
                      marginBottom: 8,
                      fontSize: 13,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    📢 {a.instruction}
                  </div>
                )}
                {a.items.map((item) => (
                  <ItemCard key={item.assignedItemId} item={item} />
                ))}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
