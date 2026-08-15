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
  completed: boolean;
  photoUrl: string | null;
  photoMimeType: string | null;
  photoFilename: string | null;
  audioUrl: string | null;
  audioFilename: string | null;
  videoUrl: string | null;
  videoFilename: string | null;
};
type SharedAssignment = { assignmentId: string; items: SharedItem[] };
type SharedData = {
  studentName: string;
  date: string;
  progress: number;
  assignments: SharedAssignment[];
};

export default function SharePage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState("");

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

  return (
    <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{data.studentName} 학생의 학습 기록</h1>
      <p style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>{data.date}</p>

      <div
        style={{
          background: "#eee",
          borderRadius: 8,
          overflow: "hidden",
          height: 20,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: data.progress + "%",
            background: "#4caf50",
            height: "100%",
          }}
        />
      </div>
      <p style={{ fontSize: 14, marginBottom: 16 }}>진행률 {data.progress}%</p>

      {data.assignments.length === 0 && (
        <p style={{ color: "#888" }}>해당 날짜에 배정된 체크리스트가 없습니다.</p>
      )}

      {data.assignments.map(function (a) {
        return (
          <div key={a.assignmentId}>
            {a.items.map(function (item) {
              return (
                <div
                  key={item.assignedItemId}
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
                    <div style={{ marginBottom: 6, fontSize: 14 }}>
                      체크: {item.checked ? "완료" : "미완료"}
                    </div>
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
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
