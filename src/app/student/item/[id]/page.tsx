"use client";

import { useEffect, useRef, useState } from "react";
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
  hasQrScan: boolean;
  qrScannedUrl: string | null;
  qrScannedAt: string | null;
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

type SubmittedPhoto = { submissionId: string; url: string; mimeType: string; filename: string };

const MAX_PHOTOS = 3;

// 사진 제출: 1장만 올려도 완료, 최대 3장(PDF 포함)까지 추가로 올릴 수 있다.
function PhotoSubmissionBlock(props: { assignedItemId: string; onDone: () => void }) {
  const meta = kindMeta.photo;
  const [photos, setPhotos] = useState<SubmittedPhoto[]>([]);
  const [maxPhotos, setMaxPhotos] = useState(MAX_PHOTOS);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const remaining = Math.max(0, maxPhotos - photos.length);

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.assignedItemId]);

  async function loadPhotos() {
    const res = await fetch(`/api/student/assigned-items/${props.assignedItemId}/photo`);
    if (res.ok) {
      const data = await res.json();
      setPhotos(Array.isArray(data.photos) ? data.photos : []);
      if (typeof data.maxPhotos === "number") setMaxPhotos(data.maxPhotos);
    }
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (picked.length === 0) return;
    let chosen = picked;
    if (picked.length > remaining) {
      chosen = picked.slice(0, remaining);
      setMsg(`사진은 최대 ${maxPhotos}장까지예요. 앞의 ${remaining}장만 선택했어요.`);
    } else {
      setMsg("");
    }
    setFiles(chosen);
    setPreviews(chosen.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : "")));
  }

  async function handleSubmit() {
    if (files.length === 0) return;
    setUploading(true);
    setMsg("");
    let okCount = 0;
    let lastError = "";
    for (const f of files) {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch(`/api/student/assigned-items/${props.assignedItemId}/photo`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) okCount += 1;
      else lastError = data.error || "업로드 실패";
    }
    setFiles([]);
    setPreviews([]);
    if (lastError) setMsg(okCount > 0 ? `${okCount}장 제출 완료, 일부 실패: ${lastError}` : "실패: " + lastError);
    else setMsg(`${okCount}장 제출 완료!`);
    await loadPhotos();
    props.onDone();
    setUploading(false);
  }

  async function handleDelete(submissionId: string) {
    if (!confirm("이 사진을 삭제하시겠어요?")) return;
    setUploading(true);
    const res = await fetch(
      `/api/student/assigned-items/${props.assignedItemId}/photo?submissionId=${encodeURIComponent(submissionId)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setMsg("삭제되었어요.");
      await loadPhotos();
      props.onDone();
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg("삭제 실패: " + (data.error || ""));
    }
    setUploading(false);
  }

  const submitted = photos.length > 0;

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
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>1장만 올려도 완료돼요 · 최대 {maxPhotos}장</div>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: submitted ? colors.green : colors.textMuted,
            background: submitted ? colors.greenLight : colors.bg,
            borderRadius: 999,
            padding: "5px 12px",
            whiteSpace: "nowrap",
          }}
        >
          {submitted ? `제출됨 ${photos.length}/${maxPhotos}장` : "미제출"}
        </span>
      </div>

      <div style={{ background: colors.blueLight, borderRadius: 14, padding: 14, marginBottom: 14, fontSize: 13, color: colors.navy }}>
        <b>💡 사진 TIP</b>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          {meta.tips.map((t) => (
            <li key={t} style={{ marginBottom: 2 }}>
              {t}
            </li>
          ))}
        </ul>
      </div>

      {photos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
          {photos.map((p, i) => (
            <div key={p.submissionId} style={{ border: `1px solid ${colors.border}`, borderRadius: 14, padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.textSecondary, marginBottom: 6 }}>사진 {i + 1}</div>
              {p.mimeType === "application/pdf" ? (
                <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: colors.blue }}>
                  📄 {p.filename || "제출 PDF 열어보기"}
                </a>
              ) : (
                <img src={p.url} alt={`제출 사진 ${i + 1}`} style={{ maxWidth: "100%", borderRadius: 10 }} />
              )}
              <button
                onClick={() => handleDelete(p.submissionId)}
                disabled={uploading}
                style={{ display: "block", marginTop: 6, fontSize: 12, color: colors.pink, background: "none", border: "none", padding: 0 }}
              >
                이 사진 삭제
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "24px 12px",
              border: `2px dashed ${colors.border}`,
              borderRadius: 14,
              marginBottom: 12,
              cursor: "pointer",
              color: colors.textSecondary,
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 26 }}>{meta.heroIcon}</span>
            {files.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 6 }}>
                {files.map((f, i) =>
                  previews[i] ? (
                    <img key={i} src={previews[i]} alt="미리보기" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 10 }} />
                  ) : (
                    <span key={i} style={{ fontSize: 12 }}>📄 {f.name}</span>
                  )
                )}
              </div>
            ) : (
              <span>
                {photos.length === 0 ? "눌러서 사진을 선택하세요" : "눌러서 사진을 더 추가하세요"} (앞으로 {remaining}장 더 가능)
              </span>
            )}
            <input type="file" accept={meta.accept} multiple onChange={handlePick} style={{ display: "none" }} />
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
            {uploading ? "제출 중..." : files.length > 0 ? `사진 ${files.length}장 제출하기` : photos.length === 0 ? meta.actionLabel : "사진 추가 제출하기"}
          </button>
        </>
      )}
      {remaining === 0 && (
        <p style={{ fontSize: 12, color: colors.textSecondary, margin: 0 }}>최대 {maxPhotos}장을 모두 올렸어요. 바꾸려면 사진을 삭제한 뒤 다시 올려주세요.</p>
      )}

      {msg && <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>{msg}</p>}
      <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 10 }}>🔒 제출한 내용은 선생님만 확인할 수 있어요.</p>
    </div>
  );
}

function isLink(text: string) {
  return /^https?:\/\//i.test(text.trim());
}

function QrScanBlock(props: { assignedItemId: string; scannedUrl: string | null; onDone: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [justScanned, setJustScanned] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScan() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      tick();
    } catch (e) {
      setError("카메라를 사용할 수 없어요. 카메라 권한을 허용해주세요.");
    }
  }

  async function tick() {
    const jsQR = (await import("jsqr")).default;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      stopCamera();
      await handleScanned(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  async function handleScanned(text: string) {
    const res = await fetch(`/api/student/assigned-items/${props.assignedItemId}/qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: text }),
    });
    if (res.ok) {
      setJustScanned(text);
      if (isLink(text)) {
        // 휴대폰 브라우저는 자동으로 연 새 창을 막는 경우가 많아, 막히면 아래 "링크 열기" 버튼으로 연다.
        window.open(text, "_blank", "noreferrer");
      }
      props.onDone();
    } else {
      const data = await res.json().catch(() => ({}));
      setError("실패: " + (data.error || "다시 시도해주세요."));
    }
  }

  async function handleRescan() {
    await startScan();
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
          📱
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: colors.navy }}>QR 스캔</div>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: props.scannedUrl ? colors.green : colors.textMuted,
            background: props.scannedUrl ? colors.greenLight : colors.bg,
            borderRadius: 999,
            padding: "5px 12px",
          }}
        >
          {props.scannedUrl ? "스캔 완료 ✓" : "미스캔"}
        </span>
      </div>

      {props.scannedUrl && !scanning && (
        <div style={{ marginBottom: 14 }}>
          {isLink(props.scannedUrl) ? (
            <a
              href={props.scannedUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                textAlign: "center",
                padding: 13,
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                background: colors.blueGradient,
                borderRadius: 12,
                textDecoration: "none",
                marginBottom: 8,
              }}
            >
              🔗 {justScanned ? "링크 열기" : "스캔한 링크 다시 열기"}
            </a>
          ) : (
            <div
              style={{
                fontSize: 14,
                color: colors.navy,
                background: colors.bg,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>📄 QR에 담긴 내용</div>
              {props.scannedUrl}
            </div>
          )}
          <button
            onClick={handleRescan}
            style={{ fontSize: 12, color: colors.pink, background: "none", border: "none" }}
          >
            다시 스캔하기
          </button>
        </div>
      )}

      <div style={{ display: scanning ? "block" : "none", marginBottom: 12 }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", borderRadius: 12, background: "#000" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <button
          onClick={stopCamera}
          style={{ marginTop: 8, width: "100%", padding: 12, fontSize: 14, fontWeight: 700, color: colors.navy, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12 }}
        >
          취소
        </button>
      </div>

      {!props.scannedUrl && !scanning && (
        <button
          onClick={startScan}
          style={{
            width: "100%",
            padding: 14,
            fontSize: 15,
            fontWeight: 700,
            color: "#fff",
            background: colors.blueGradient,
            border: "none",
            borderRadius: 12,
          }}
        >
          📷 QR 찍기
        </button>
      )}

      {error && <p style={{ fontSize: 12, color: colors.pink, marginTop: 8 }}>{error}</p>}
      <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 10 }}>📖 책에 인쇄된 QR코드를 카메라로 비춰주세요.</p>
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

  // 들어오기 전 화면(홈/체크리스트/지난기록)으로 돌아간다. 이전 화면이 없으면(링크로 바로 들어온 경우) 체크리스트로 간다.
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.replace("/student/checklist");
    }
  }

  // 맨 아래 완료 버튼: 체크 항목이면 체크까지 한 뒤 이전 화면으로 돌아간다.
  // 제출 항목은 완료 여부가 제출로 정해지므로 돌아가기만 한다.
  const [finishing, setFinishing] = useState(false);
  async function handleFinish() {
    if (!item) return;
    setFinishing(true);
    if (item.hasCheck && !item.checked) {
      await fetch("/api/student/assigned-items/" + item.assignedItemId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: true }),
      }).catch(() => {});
    }
    goBack();
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
          <button onClick={goBack} style={{ fontSize: 20, color: colors.navy, background: "none", border: "none" }}>
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
          <PhotoSubmissionBlock assignedItemId={item.assignedItemId} onDone={load} />
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
        {item.hasQrScan && (
          <QrScanBlock assignedItemId={item.assignedItemId} scannedUrl={item.qrScannedUrl} onDone={load} />
        )}

        <button
          onClick={handleFinish}
          disabled={finishing}
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
          {finishing ? "저장 중..." : item.hasCheck && !item.checked ? "✓ 학습 완료 체크" : "✓ 완료"}
        </button>
      </div>
    </div>
  );
}

