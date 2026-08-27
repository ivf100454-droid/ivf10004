"use client";

import { useEffect, useState } from "react";
import { colors, fontFamily } from "../theme";

type PreviewResult = {
  dryRun: true;
  cutoffDate: string;
  eligibleCount: number;
  candidates: { assignmentId: string; studentName: string; date: string }[];
};
type RunResult = {
  dryRun: false;
  cutoffDate: string;
  totalCandidates: number;
  successCount: number;
  failedCount: number;
  failedDetails: { studentName: string; date: string; detail?: string }[];
};
type AuditLog = {
  logId: string;
  studentName: string;
  checklistDate: string;
  status: "success" | "failed";
  deletedFileCount: number;
  detail: string | null;
  triggeredBy: string;
  createdAt: string;
};

const card: React.CSSProperties = {
  background: colors.card,
  borderRadius: 16,
  boxShadow: "0 2px 10px rgba(21,42,84,0.05)",
};
const box: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 15,
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  fontFamily,
};
const primaryBtn: React.CSSProperties = {
  padding: "13px 18px",
  fontSize: 15,
  fontWeight: 700,
  color: "#fff",
  background: colors.blueGradient,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
};
const dangerBtn: React.CSSProperties = {
  padding: "13px 18px",
  fontSize: 15,
  fontWeight: 700,
  color: "#fff",
  background: colors.pink,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
};

export default function RetentionPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function refreshLogs() {
    const res = await fetch("/api/admin/retention");
    if (res.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    if (res.ok) setLogs(await res.json());
  }

  useEffect(() => {
    refreshLogs();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginMsg("로그인 중...");
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });
    if (res.ok) {
      setLoginMsg("");
      await refreshLogs();
    } else {
      const data = await res.json().catch(() => ({}));
      setLoginMsg(data.error || "로그인 실패");
    }
  }

  async function handlePreview() {
    setLoading(true);
    setMsg("");
    setRunResult(null);
    const res = await fetch("/api/admin/retention", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun: true }),
    });
    const data = await res.json();
    setPreview(data);
    setLoading(false);
  }

  async function handleRun() {
    if (!preview) return;
    if (
      !window.confirm(
        `${preview.eligibleCount}건의 기록을 지금 영구 삭제합니다 (제출된 사진/음성/영상/파일 포함).\n되돌릴 수 없어요. 정말 진행하시겠어요?`
      )
    )
      return;
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/admin/retention", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun: false }),
    });
    const data = await res.json();
    setRunResult(data);
    setPreview(null);
    await refreshLogs();
    setLoading(false);
  }

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto", padding: 16, fontFamily }}>
        <h1 style={{ fontSize: 20, marginBottom: 16, color: colors.navy }}>관리자 로그인</h1>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} style={box} />
          <input placeholder="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={box} />
          <button type="submit" style={primaryBtn}>
            로그인
          </button>
        </form>
        {loginMsg && <p style={{ color: colors.pink }}>{loginMsg}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "24px auto", padding: 16, fontFamily }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: colors.navy }}>30일 보존기간 정리</h1>
      <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 0, marginBottom: 20 }}>
        수업일 기준 30일이 지난 체크리스트 기록과 제출 파일을 정리합니다. 관리자가 개별
        기록에 "보존 잠금"을 걸어두면 그 기록은 제외됩니다. 자동 실행은 켜져 있지 않으며,
        아래 버튼을 눌러야만 실행됩니다.
      </p>

      <div style={{ ...card, padding: 18, marginBottom: 20 }}>
        <button onClick={handlePreview} disabled={loading} style={{ ...primaryBtn, width: "100%", marginBottom: 10 }}>
          {loading ? "확인 중..." : "1. 미리보기 (아무것도 지우지 않음)"}
        </button>

        {preview && (
          <div style={{ marginTop: 10 }}>
            <p style={{ fontSize: 14, color: colors.navy, fontWeight: 700 }}>
              기준일 {preview.cutoffDate} 이전 — 정리 대상 {preview.eligibleCount}건
            </p>
            {preview.eligibleCount === 0 ? (
              <p style={{ fontSize: 13, color: colors.textSecondary }}>정리할 기록이 없습니다.</p>
            ) : (
              <>
                <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 12 }}>
                  {preview.candidates.map((c) => (
                    <div
                      key={c.assignmentId}
                      style={{ fontSize: 13, color: colors.textSecondary, padding: "6px 0", borderBottom: `1px solid ${colors.border}` }}
                    >
                      {c.date} · {c.studentName}
                    </div>
                  ))}
                </div>
                <button onClick={handleRun} disabled={loading} style={{ ...dangerBtn, width: "100%" }}>
                  {loading ? "정리 중..." : `2. 지금 ${preview.eligibleCount}건 영구 삭제 실행`}
                </button>
              </>
            )}
          </div>
        )}

        {runResult && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: colors.greenLight }}>
            <p style={{ fontSize: 14, color: colors.navy, fontWeight: 700, margin: 0 }}>
              완료 — 성공 {runResult.successCount}건 / 실패 {runResult.failedCount}건 (전체 {runResult.totalCandidates}건)
            </p>
            {runResult.failedCount > 0 && (
              <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6 }}>
                실패한 건은 파일 삭제 중 오류가 나서 이번엔 건너뛰었어요 — 다음 정리 실행 때 자동으로 다시 시도됩니다.
              </p>
            )}
          </div>
        )}
        {msg && <p style={{ fontSize: 13, color: colors.pink, marginTop: 8 }}>{msg}</p>}
      </div>

      <div style={{ ...card, padding: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10, color: colors.navy }}>최근 정리 기록 (감사 로그)</h2>
        {logs.length === 0 && <p style={{ fontSize: 13, color: colors.textSecondary }}>아직 정리 실행 기록이 없습니다.</p>}
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {logs.map((l) => (
            <div key={l.logId} style={{ padding: "8px 0", borderBottom: `1px solid ${colors.border}`, fontSize: 12 }}>
              <span style={{ color: l.status === "success" ? colors.green : colors.pink, fontWeight: 700 }}>
                {l.status === "success" ? "✅ 성공" : "⚠️ 실패"}
              </span>{" "}
              {l.checklistDate.slice(0, 10)} · {l.studentName} · 파일 {l.deletedFileCount}개 삭제
              {l.detail && <div style={{ color: colors.textSecondary, marginTop: 2 }}>{l.detail}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
