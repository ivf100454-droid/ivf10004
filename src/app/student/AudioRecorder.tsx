"use client";

import { useEffect, useRef, useState } from "react";
import { colors } from "./theme";

const MAX_SECONDS = 180; // 최대 녹음 3분
// 말소리용 낮은 비트레이트 — 3분 녹음이 약 1MB 안팎이 되도록
const BITS_PER_SECOND = 48000;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* 무시 */
    }
  }
  return "";
}

function extFor(baseType: string) {
  if (baseType === "audio/mp4") return "m4a";
  if (baseType === "audio/ogg") return "ogg";
  return "webm";
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/**
 * 앱 안에서 바로 녹음하는 버튼. 녹음이 끝나면 File로 만들어 onRecorded로 넘겨준다.
 * 다시 녹음하면 onRecorded(null)로 이전 녹음을 지운다. 제출은 부모 화면의 제출 버튼이 맡는다.
 */
export default function AudioRecorder(props: { onRecorded: (file: File | null) => void; disabled?: boolean }) {
  const [phase, setPhase] = useState<"idle" | "recording" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function cleanupStream() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    return () => {
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      } catch {
        /* 무시 */
      }
      cleanupStream();
    };
  }, []);

  async function start() {
    setError("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("이 브라우저에서는 바로 녹음이 안 돼요. 크롬이나 삼성인터넷으로 열거나, 아래에서 녹음 파일을 선택해주세요.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("마이크를 쓸 수 없어요. 마이크 권한을 '허용'으로 바꾼 뒤 다시 눌러주세요.");
      return;
    }
    streamRef.current = stream;
    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: BITS_PER_SECOND } : undefined);
    } catch {
      recorder = new MediaRecorder(stream);
    }
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      cleanupStream();
      // 서버가 형식을 알아보도록 ";codecs=..." 부분은 떼고 저장한다.
      const baseType = (recorder.mimeType || mimeType || "audio/webm").split(";")[0];
      const blob = new Blob(chunksRef.current, { type: baseType });
      if (blob.size === 0) {
        setError("녹음된 소리가 없어요. 다시 녹음해주세요.");
        setPhase("idle");
        return;
      }
      const file = new File([blob], `recording-${Date.now()}.${extFor(baseType)}`, { type: baseType });
      setPreviewUrl(URL.createObjectURL(blob));
      setPhase("done");
      props.onRecorded(file);
    };
    recorderRef.current = recorder;
    recorder.start(1000);
    setSeconds(0);
    setPhase("recording");
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (next >= MAX_SECONDS) stop();
        return next;
      });
    }, 1000);
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setSeconds(0);
    setPhase("idle");
    props.onRecorded(null);
  }

  const bigButton = {
    width: 72,
    height: 72,
    borderRadius: "50%",
    border: "none",
    fontSize: 30,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
  } as const;

  return (
    <div
      style={{
        border: `2px solid ${phase === "recording" ? colors.pink : colors.border}`,
        borderRadius: 14,
        padding: "18px 12px",
        marginBottom: 12,
        textAlign: "center",
      }}
    >
      {phase === "idle" && (
        <>
          <button onClick={start} disabled={props.disabled} style={{ ...bigButton, background: colors.pinkGradient }}>
            🎤
          </button>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy, marginTop: 10 }}>눌러서 바로 녹음하기</div>
          <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>최대 3분까지 녹음돼요</div>
        </>
      )}

      {phase === "recording" && (
        <>
          <button onClick={stop} style={{ ...bigButton, background: colors.navy, fontSize: 24 }}>
            ■
          </button>
          <div style={{ fontSize: 20, fontWeight: 800, color: colors.pink, marginTop: 10 }}>
            ● {fmt(seconds)} <span style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 600 }}>/ {fmt(MAX_SECONDS)}</span>
          </div>
          <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>녹음 중이에요. 다 읽으면 ■ 를 눌러주세요.</div>
        </>
      )}

      {phase === "done" && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.navy, marginBottom: 8 }}>
            ✅ 녹음 완료 ({fmt(seconds)}) — 들어보고 제출해주세요
          </div>
          {previewUrl && <audio controls src={previewUrl} style={{ width: "100%" }} />}
          <button
            onClick={reset}
            disabled={props.disabled}
            style={{
              marginTop: 10,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 700,
              color: colors.pink,
              background: "#fff",
              border: `1px solid ${colors.pink}`,
              borderRadius: 999,
            }}
          >
            🔄 지우고 다시 녹음
          </button>
        </>
      )}

      {error && <p style={{ fontSize: 12, color: colors.pink, margin: "10px 0 0" }}>{error}</p>}
    </div>
  );
}
