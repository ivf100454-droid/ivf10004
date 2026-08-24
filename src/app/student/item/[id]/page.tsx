"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { colors, fontFamily, getItemVisual } from "../../theme";

type TeachingVideo = { title: string; url: string };

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
  linkUrl: string | null;
  linkLabel: string | null;
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
  hasFileSubmission: boolean;
  completed: boolean;
  teachingVideo: TeachingVideo | null;
};
type Assignment = { assignmentId: string; items: AssignedItem[] };
type TodayData = { assignments: Assignment[] };

const kindMeta: Record<
  "photo" | "audio" | "video" | "file",
  { title: string; accept: string; icon: string; tips: string[]; actionLabel: string; heroIcon: string }
> = {
  photo: {
    title: "사진 제출",
    accept: "image/*,application/pdf",
    icon: "📷",
    heroIcon: "📷",
    actionLabel: "사진 제출하기",
    tips: ["빛이 잘 드는 곳에서 찍어주세요.", "글자가 선명하게 보이도록 초점을 맞춰주세요.", "시험지 전체가 보이도록 촬영해주세요."],
  },
  video: {
    title: "영상 제출",
    accept: "video/*",
    icon: "🎬",
    heroIcon: "🎬",
    actionLabel: "영상 제출하기",
    tips: ["조용한 곳에서 촬영하면 더 잘 들려요.", "입과 얼굴이 잘 보이도록 찍어주세요.", "흔들리지 않게 가로로 촬영하면 좋아요."],
  },
  audio: {
    title: "음성 제출",
    accept: "audio/*",
    icon: "🎤",
    heroIcon: "🎤",
    actionLabel: "음성 제출하기",
    tips: ["조용한 곳에서 녹음해주세요.", "또박또박 말해주세요."],
  },
  file: {
    title: "파일 제출",
    accept: "*/*",
    icon: "📎",
    heroIcon: "📎",
    actionLabel: "파일 제출하기",
    tips: ["제출 전에 파일 내용을 다시 한번 확인해주세요."],
  },
};

function scoreOptions(maxScore: number) {
  const opts: number[] = [];
  for (let v = 10; v <= maxScore; v += 10) opts.push(v);
  return opts;
}

function SubmissionBlock(props: {
  assignedItemId: string;
  kind: "photo" | "audio" | "video" | "file";
  submitted: boolean;
  onDone: () => void;
}) {
  const meta = kindMeta[props.kind];
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [viewUrl, setViewUrl] = useState("");
  const [viewMimeType, setViewMimeType] = useState("");
  const [viewFilename, setViewFilename] = useState("");

  useEffect(() => {
    if (props.submitted) handleView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.submitted]);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFiles([f]);
    setPreviews(f.type.startsWith("image/") ? [URL.createObjectURL(f)] : []);
  }

  async function handleSubmit() {
    if (files.length === 0) return;
    setUploading(true);
    setMsg("");
    const formData = new FormData();
    formData.append("file", files[0]);
    const res = await fetch(`/api/student/assigned-items/${props.assignedItemId}/${props.kind}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg("제출 완료!");
      setFiles([]);
      setPreviews([]);
      props.onDone();
    } else {
      setMsg("실패: " + data.error);
    }
    setUploading(false);
  }

  async function handleView() {
    const res = await fetch(`/api/student/assigned-items/${props.assignedItemId}/${props.kind}`);
    if (res.ok) {
      const data = await res.json();
      setViewUrl(data.url);
      setViewMimeType(data.mimeType || "");
      setViewFilename(data.filename || "");
    }
  }

  async function handleDelete() {
    if (!confirm("제출한 파일을 삭제하시겠어요?")) return;
    setUploading(true);
    const res = await fetch(`/api/student/assigned-items/${props.assignedItemId}/${props.kind}`, { method: "DELETE" });
    if (res.ok) {
      setViewUrl("");
      setMsg("삭제되었어요.");
      props.onDone();
    }
    setUploading(false);
  }

  return (
    <div style={{ background: colors.card, borderRadius: 20, padding: 20, marginBottom: 14, boxShadow: "0 2px 10px rgba(21,42,84,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: colors.blueLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          {meta.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: colors.navy }}>{meta.title}</div>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: props.submitted ? colors.green : colors.textMuted,
            background: props.submitted ? colors.greenLight : colors.bg,
            borderRadius: 999,
            padding: "5px 12px",
          }}
        >
          {props.submitted ? "제출됨 ✓" : "미제출"}
        </span>
      </div>

      <div style={{ background: colors.blueLight, borderRadius: 14, padding: 14, marginBottom: 14, fontSize: 13, color: colors.navy }}>
        <b>💡 {props.kind === "photo" ? "사진" : props.kind === "video" ? "영상" : props.kind === "audio" ? "음성" : "파일"} TIP</b>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          {meta.tips.map((t) => (
            <li key={t} style={{ marginBottom: 2 }}>
              {t}
            </li>
          ))}
        </ul>
      </div>

      {viewUrl && (
        <div style={{ marginBottom: 14 }}>
          {viewMimeType.startsWith("image/") && <img src={viewUrl} alt="제출" style={{ maxWidth: "100%", borderRadius: 12 }} />}
          {viewMimeType.startsWith("video/") && <video controls src={viewUrl} style={{ width: "100%", borderRadius: 12, maxHeight: 300 }} />}
          {viewMimeType.startsWith("audio/") && <audio controls src={viewUrl} style={{ width: "100%" }} />}
          {viewMimeType === "application/pdf" && (
            <a href={viewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: colors.blue }}>
              📄 {viewFilename || "제출 파일 열어보기"}
            </a>
          )}
          {!viewMimeType.startsWith("image/") &&
            !viewMimeType.startsWith("video/") &&
            !viewMimeType.startsWith("audio/") &&
            viewMimeType !== "application/pdf" && (
              <a href={viewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: colors.blue }}>
                📎 {viewFilename || "제출 파일 열어보기"}
              </a>
            )}
          <button
            onClick={handleDelete}
            disabled={uploading}
            style={{ display: "block", marginTop: 8, fontSize: 12, color: colors.pink, background: "none", border: "none" }}
          >
            제출한 파일 삭제하고 다시 올리기
          </button>
        </div>
      )}

      {!viewUrl && (
        <>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "28px 12px",
              border: `2px dashed ${colors.border}`,
              borderRadius: 14,
              marginBottom: 12,
              cursor: "pointer",
              color: colors.textSecondary,
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 26 }}>{meta.heroIcon}</span>
            {previews[0] ? (
              <img src={previews[0]} alt="미리보기" style={{ maxWidth: "100%", maxHeight: 140, borderRadius: 10, marginTop: 8 }} />
            ) : files[0] ? (
              <span>{files[0].name}</span>
            ) : (
              <span>눌러서 {meta.title.replace("제출", "")}을 선택하세요</span>
            )}
            <input type="file" accept={meta.accept} onChange={handlePick} style={{ display: "none" }} />
          </label>

          <button
            onClick={handleSubmit}
            disabled={uploading || files.length === 0}
            style={{
              width: "100%",
              padding: 14,
              fontSize: 15,
              fontWeight: 700,
              color: "#fff",
              background: files.length === 0 ? colors.textMuted : colors.blueGradient,
              border: "none",
              borderRadius: 12,
            }}
          >
            {uploading ? "제출 중..." : meta.actionLabel}
          </button>
        </>
      )}

      {msg && <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>{msg}</p>}
      <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 10 }}>🔒 제출한 내용은 선생님만 확인할 수 있어요.</p>
    </div>
  );
}

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<TodayData | null>(null);
  const [item, setItem] = useState<AssignedItem | null>(null);

  async function load() {
    const res = await fetch("/api/student/today");
    if (!res.ok) return;
    const d: TodayData = await res.json();
    setData(d);
    const found = d.assignments.flatMap((a) => a.items).find((i) => i.assignedItemId === params.id) || null;
    setItem(found);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function patchItem(patch: Record<string, unknown>) {
    if (!item) return;
    await fetch("/api/student/assigned-items/" + item.assignedItemId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  if (!data) {
    return (
      <div style={{ fontFamily, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: colors.textSecondary }}>
        불러오는 중...
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ fontFamily, minHeight: "100vh", background: colors.bg, padding: 24, textAlign: "center", color: colors.textSecondary }}>
        항목을 찾을 수 없어요.
        <br />
        <Link href="/student" style={{ color: colors.blue }}>
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const visual = getItemVisual(item);

  return (
    <div style={{ fontFamily, minHeight: "100vh", background: colors.bg, paddingBottom: 40 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={() => router.back()} style={{ fontSize: 20, color: colors.navy, background: "none", border: "none" }}>
            ‹
          </button>
          <div style={{ fontSize: 17, fontWeight: 800, color: colors.navy }}>학습 상세</div>
          <span style={{ width: 20 }} />
        </div>

        <div
          style={{
            background: colors.card,
            borderRadius: 20,
            padding: 20,
            marginBottom: 14,
            boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: visual.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              flexShrink: 0,
            }}
          >
            {visual.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: colors.navy }}>{item.title}</div>
            {item.hasScore && item.maxScore && (
              <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                목표 점수 {item.maxScore}점 만점 · 나의 점수 {item.score ?? "-"} / {item.maxScore}
              </div>
            )}
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: item.completed ? colors.green : colors.textMuted,
              background: item.completed ? colors.greenLight : colors.bg,
              borderRadius: 999,
              padding: "5px 12px",
              whiteSpace: "nowrap",
            }}
          >
            {item.completed ? "완료" : "진행중"}
          </span>
        </div>

        {item.hasCheck && (
          <div style={{ background: colors.card, borderRadius: 20, padding: 20, marginBottom: 14, boxShadow: "0 2px 10px rgba(21,42,84,0.05)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => patchItem({ checked: e.target.checked })}
                style={{ width: 22, height: 22 }}
              />
              <span style={{ fontSize: 15, fontWeight: 700, color: colors.navy }}>체크 완료</span>
            </label>
          </div>
        )}

        {item.hasCount && (
          <div style={{ background: colors.card, borderRadius: 20, padding: 20, marginBottom: 14, boxShadow: "0 2px 10px rgba(21,42,84,0.05)" }}>
            <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 10 }}>🔁 반복 학습</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                onClick={() => patchItem({ currentCount: Math.max(0, item.currentCount - 1) })}
                disabled={item.currentCount <= 0}
                style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.bg, fontSize: 18 }}
              >
                −
              </button>
              <span style={{ fontSize: 20, fontWeight: 800, color: colors.navy }}>
                {item.currentCount} / {item.targetCount} 회
              </span>
              <button
                onClick={() => patchItem({ currentCount: item.currentCount + 1 })}
                style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: colors.blue, color: "#fff", fontSize: 18 }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {item.hasScore && item.maxScore && (
          <div style={{ background: colors.card, borderRadius: 20, padding: 20, marginBottom: 14, boxShadow: "0 2px 10px rgba(21,42,84,0.05)" }}>
            <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 10 }}>🏆 점수 입력</div>
            <select
              value={item.score ?? ""}
              onChange={(e) => patchItem({ score: e.target.value === "" ? null : Number(e.target.value) })}
              style={{ padding: 12, fontSize: 15, borderRadius: 10, border: `1px solid ${colors.border}`, width: "100%" }}
            >
              <option value="">점수 선택</option>
              {scoreOptions(item.maxScore).map((v) => (
                <option key={v} value={v}>
                  {v}점
                </option>
              ))}
            </select>
          </div>
        )}

        {item.linkUrl && (
          <a
            href={item.linkUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block",
              background: colors.blueLight,
              borderRadius: 16,
              padding: 16,
              marginBottom: 14,
              color: colors.blue,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            🔗 {item.linkLabel || "자료 열기"}
          </a>
        )}

        {item.teachingVideo && (
          <div style={{ background: colors.card, borderRadius: 20, padding: 16, marginBottom: 14, boxShadow: "0 2px 10px rgba(21,42,84,0.05)" }}>
            <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>🎓 학습영상: {item.teachingVideo.title}</div>
            <video controls src={item.teachingVideo.url} style={{ width: "100%", borderRadius: 12, maxHeight: 300 }} />
          </div>
        )}

        {item.hasPhotoSubmission && (
          <SubmissionBlock assignedItemId={item.assignedItemId} kind="photo" submitted={item.completed || false} onDone={load} />
        )}
        {item.hasAudioSubmission && (
          <SubmissionBlock assignedItemId={item.assignedItemId} kind="audio" submitted={item.completed || false} onDone={load} />
        )}
        {item.hasVideoSubmission && (
          <SubmissionBlock assignedItemId={item.assignedItemId} kind="video" submitted={item.completed || false} onDone={load} />
        )}
        {item.hasFileSubmission && (
          <SubmissionBlock assignedItemId={item.assignedItemId} kind="file" submitted={item.completed || false} onDone={load} />
        )}

        {(item.hasCheck || item.hasCount || item.hasScore) &&
          !item.hasPhotoSubmission &&
          !item.hasAudioSubmission &&
          !item.hasVideoSubmission &&
          !item.hasFileSubmission && (
            <button
              onClick={() => {
                if (item.hasCheck) patchItem({ checked: true });
                router.push("/student/checklist");
              }}
              style={{
                width: "100%",
                padding: 15,
                fontSize: 16,
                fontWeight: 700,
                color: "#fff",
                background: colors.green,
                border: "none",
                borderRadius: 14,
                marginTop: 4,
              }}
            >
              ✓ 학습 완료 체크
            </button>
          )}
      </div>
    </div>
  );
}
