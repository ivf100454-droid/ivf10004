"use client";

import { useEffect, useState } from "react";
import { colors, fontFamily } from "../theme";

type Student = { studentId: string; name: string; studentStatus: string };
type Template = { templateId: string; name: string; items: { templateItemId: string }[] };

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
  teachingVideo: { title: string; url: string } | null;
};
type Assignment = { assignmentId: string; items: AssignedItem[] };
type TodayData = { assignments: Assignment[]; progress: number };

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
const smallGhostBtn: React.CSSProperties = {
  fontSize: 12,
  padding: "5px 10px",
  color: colors.blue,
  background: colors.blueLight,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};
const smallDangerBtn: React.CSSProperties = {
  fontSize: 12,
  padding: "5px 10px",
  color: colors.pink,
  background: "none",
  border: `1px solid ${colors.pink}`,
  borderRadius: 8,
  cursor: "pointer",
};

function UploaderShell(props: {
  fileInput: React.ReactNode;
  onView: () => void;
  onDelete: () => void;
  uploading: boolean;
  msg: string;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        {props.fileInput}
        <button type="button" onClick={props.onView} style={smallGhostBtn}>
          파일 보기
        </button>
        <button type="button" onClick={props.onDelete} disabled={props.uploading} style={smallDangerBtn}>
          삭제
        </button>
        {props.msg && <span style={{ fontSize: 12, color: colors.textSecondary }}>{props.msg}</span>}
      </div>
      {props.children}
    </div>
  );
}

function PhotoUploader(props: { assignedItemId: string; onDone: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [viewUrl, setViewUrl] = useState("");
  const [viewMimeType, setViewMimeType] = useState("");
  const [viewFilename, setViewFilename] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/photo", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      setMsg("업로드 완료");
      props.onDone();
    } else {
      setMsg("실패: " + data.error);
    }
    setUploading(false);
  }

  async function handleView() {
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/photo");
    if (res.ok) {
      const data = await res.json();
      setViewUrl(data.url);
      setViewMimeType(data.mimeType || "");
      setViewFilename(data.filename || "");
    } else {
      setMsg("아직 제출된 파일이 없습니다.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("업로드된 파일을 삭제하시겠어요?")) return;
    setUploading(true);
    setMsg("");
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/photo", {
      method: "DELETE",
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      setMsg("삭제 완료");
      setViewUrl("");
      setViewMimeType("");
      setViewFilename("");
      props.onDone();
    } else {
      setMsg("삭제 실패: " + data.error);
    }
    setUploading(false);
  }

  return (
    <UploaderShell
      fileInput={<input type="file" accept="image/*,application/pdf" onChange={handleFile} disabled={uploading} />}
      onView={handleView}
      onDelete={handleDelete}
      uploading={uploading}
      msg={msg}
    >
      {viewUrl && viewMimeType === "application/pdf" && (
        <div style={{ marginTop: 6 }}>
          <iframe
            src={viewUrl}
            title={viewFilename || "제출 PDF"}
            style={{ width: "100%", height: 500, border: `1px solid ${colors.border}`, borderRadius: 10 }}
          />
          <div style={{ marginTop: 4 }}>
            <a href={viewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: colors.blue }}>
              📄 {viewFilename || "새 창에서 크게 보기"}
            </a>
          </div>
        </div>
      )}
      {viewUrl && viewMimeType !== "application/pdf" && (
        <div style={{ marginTop: 6 }}>
          <img src={viewUrl} alt="제출 사진" style={{ maxWidth: "100%", borderRadius: 10 }} />
        </div>
      )}
    </UploaderShell>
  );
}

function AudioUploader(props: { assignedItemId: string; onDone: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [viewUrl, setViewUrl] = useState("");
  const [viewFilename, setViewFilename] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/audio", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      setMsg("업로드 완료");
      props.onDone();
    } else {
      setMsg("실패: " + data.error);
    }
    setUploading(false);
  }

  async function handleView() {
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/audio");
    if (res.ok) {
      const data = await res.json();
      setViewUrl(data.url);
      setViewFilename(data.filename || "");
    } else {
      setMsg("아직 제출된 파일이 없습니다.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("업로드된 음성 파일을 삭제하시겠어요?")) return;
    setUploading(true);
    setMsg("");
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/audio", {
      method: "DELETE",
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      setMsg("삭제 완료");
      setViewUrl("");
      setViewFilename("");
      props.onDone();
    } else {
      setMsg("삭제 실패: " + data.error);
    }
    setUploading(false);
  }

  return (
    <UploaderShell
      fileInput={<input type="file" accept="audio/*" onChange={handleFile} disabled={uploading} />}
      onView={handleView}
      onDelete={handleDelete}
      uploading={uploading}
      msg={msg}
    >
      {viewUrl && (
        <div style={{ marginTop: 6 }}>
          <audio controls src={viewUrl} style={{ width: "100%" }} />
          {viewFilename && <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{viewFilename}</div>}
        </div>
      )}
    </UploaderShell>
  );
}

function VideoUploader(props: { assignedItemId: string; onDone: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [viewUrl, setViewUrl] = useState("");
  const [viewFilename, setViewFilename] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/video", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      setMsg("업로드 완료");
      props.onDone();
    } else {
      setMsg("실패: " + data.error);
    }
    setUploading(false);
  }

  async function handleView() {
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/video");
    if (res.ok) {
      const data = await res.json();
      setViewUrl(data.url);
      setViewFilename(data.filename || "");
    } else {
      setMsg("아직 제출된 파일이 없습니다.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("업로드된 영상 파일을 삭제하시겠어요?")) return;
    setUploading(true);
    setMsg("");
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/video", {
      method: "DELETE",
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      setMsg("삭제 완료");
      setViewUrl("");
      setViewFilename("");
      props.onDone();
    } else {
      setMsg("삭제 실패: " + data.error);
    }
    setUploading(false);
  }

  return (
    <UploaderShell
      fileInput={<input type="file" accept="video/*" onChange={handleFile} disabled={uploading} />}
      onView={handleView}
      onDelete={handleDelete}
      uploading={uploading}
      msg={msg}
    >
      {viewUrl && (
        <div style={{ marginTop: 6 }}>
          <video controls src={viewUrl} style={{ width: "100%", maxHeight: 400, borderRadius: 10 }} />
          {viewFilename && <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{viewFilename}</div>}
        </div>
      )}
    </UploaderShell>
  );
}

function FileUploader(props: { assignedItemId: string; onDone: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [viewUrl, setViewUrl] = useState("");
  const [viewFilename, setViewFilename] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/file", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      setMsg("업로드 완료");
      props.onDone();
    } else {
      setMsg("실패: " + data.error);
    }
    setUploading(false);
  }

  async function handleView() {
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/file");
    if (res.ok) {
      const data = await res.json();
      setViewUrl(data.url);
      setViewFilename(data.filename || "");
    } else {
      setMsg("아직 제출된 파일이 없습니다.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("업로드된 파일을 삭제하시겠어요?")) return;
    setUploading(true);
    setMsg("");
    const res = await fetch("/api/admin/assigned-items/" + props.assignedItemId + "/file", {
      method: "DELETE",
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      setMsg("삭제 완료");
      setViewUrl("");
      setViewFilename("");
      props.onDone();
    } else {
      setMsg("삭제 실패: " + data.error);
    }
    setUploading(false);
  }

  return (
    <UploaderShell
      fileInput={<input type="file" onChange={handleFile} disabled={uploading} />}
      onView={handleView}
      onDelete={handleDelete}
      uploading={uploading}
      msg={msg}
    >
      {viewUrl && (
        <div style={{ marginTop: 6 }}>
          <a href={viewUrl} target="_blank" rel="noreferrer" style={{ color: colors.blue }}>
            📎 {viewFilename || "제출 파일 열기/다운로드"}
          </a>
        </div>
      )}
    </UploaderShell>
  );
}

export default function ChecklistTestPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [assignMsg, setAssignMsg] = useState("");

  const [viewStudentId, setViewStudentId] = useState("");
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [shareLinkUrl, setShareLinkUrl] = useState("");
  const [shareLinkMsg, setShareLinkMsg] = useState("");

  async function refreshBase() {
    const sRes = await fetch("/api/admin/students");
    const tRes = await fetch("/api/admin/templates");
    if (sRes.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setStudents(await sRes.json());
    setTemplates(await tRes.json());
  }

  useEffect(() => {
    refreshBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadToday(studentId: string) {
    if (!studentId) {
      setTodayData(null);
      return;
    }
    const res = await fetch("/api/admin/students/" + studentId + "/today");
    if (res.ok) {
      const data = await res.json();
      setTodayData(data);
    }
  }

  useEffect(() => {
    if (viewStudentId) loadToday(viewStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewStudentId]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginMsg("로그인 중...");
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId: loginId, password: password }),
    });
    if (res.ok) {
      setLoginMsg("");
      await refreshBase();
    } else {
      const data = await res.json().catch(() => ({}));
      setLoginMsg(data.error || "로그인 실패");
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setAssignMsg("");
    if (!selectedStudentId || !selectedTemplateId) {
      setAssignMsg("학생과 템플릿을 모두 선택해주세요.");
      return;
    }
    const res = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: selectedStudentId, templateId: selectedTemplateId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAssignMsg("배정 완료 (항목 " + data.items.length + "개)");
      if (viewStudentId === selectedStudentId) {
        await loadToday(selectedStudentId);
      }
    } else {
      setAssignMsg("실패: " + data.error);
    }
  }

  async function patchItem(assignedItemId: string, patch: Record<string, unknown>) {
    await fetch("/api/admin/assigned-items/" + assignedItemId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await loadToday(viewStudentId);
  }

  async function resetItem(item: AssignedItem) {
    if (!window.confirm("\"" + item.title + "\" 항목을 초기화하시겠어요? 체크/횟수/점수/제출 파일이 모두 지워집니다.")) return;
    const patch: Record<string, unknown> = {};
    if (item.hasCheck) patch.checked = false;
    if (item.hasCount) patch.currentCount = 0;
    if (item.hasScore) patch.score = null;
    if (Object.keys(patch).length > 0) {
      await patchItem(item.assignedItemId, patch);
    }
    if (item.hasPhotoSubmission) {
      await fetch("/api/admin/assigned-items/" + item.assignedItemId + "/photo", {
        method: "DELETE",
      }).catch(function () {});
    }
    if (item.hasAudioSubmission) {
      await fetch("/api/admin/assigned-items/" + item.assignedItemId + "/audio", {
        method: "DELETE",
      }).catch(function () {});
    }
    if (item.hasVideoSubmission) {
      await fetch("/api/admin/assigned-items/" + item.assignedItemId + "/video", {
        method: "DELETE",
      }).catch(function () {});
    }
    if (item.hasFileSubmission) {
      await fetch("/api/admin/assigned-items/" + item.assignedItemId + "/file", {
        method: "DELETE",
      }).catch(function () {});
    }
    await loadToday(viewStudentId);
  }

  async function handleDeleteAssignment(assignmentId: string) {
    if (!window.confirm("이 배정을 통째로 삭제하시겠어요? 안의 모든 항목과 제출 기록이 함께 삭제됩니다.")) return;
    const res = await fetch("/api/admin/assignments/" + assignmentId, { method: "DELETE" });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      await loadToday(viewStudentId);
    } else {
      alert("삭제 실패: " + data.error);
    }
  }

  async function handleCreateShareLink() {
    if (!viewStudentId) {
      setShareLinkMsg("학생을 먼저 선택해주세요.");
      return;
    }
    setShareLinkMsg("링크 생성 중...");
    setShareLinkUrl("");
    const res = await fetch("/api/admin/students/" + viewStudentId + "/share-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok) {
      const url = window.location.origin + "/share/" + data.token;
      setShareLinkUrl(url);
      setShareLinkMsg("링크가 생성되었습니다 (30일간 유효). 아래 주소를 복사해서 학부모님께 전달하세요.");
    } else {
      setShareLinkMsg("실패: " + data.error);
    }
  }

  // 퇴원 처리된 학생은 배정/조회 대상에서 제외한다.
  const activeStudents = students.filter((s) => s.studentStatus !== "withdrawn");

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto", padding: 16, fontFamily }}>
        <h1 style={{ fontSize: 20, marginBottom: 16, color: colors.navy }}>관리자 로그인</h1>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            placeholder="아이디"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            style={box}
          />
          <input
            placeholder="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={box}
          />
          <button type="submit" style={primaryBtn}>
            로그인
          </button>
        </form>
        {loginMsg && <p style={{ color: colors.pink }}>{loginMsg}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "24px auto", padding: 16, fontFamily }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: colors.navy }}>체크리스트 배정 / 오늘 확인</h1>

      <div style={{ ...card, padding: 18, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10, color: colors.navy }}>1. 학생에게 배정</h2>
        <form onSubmit={handleAssign} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            style={box}
          >
            <option value="">학생 선택</option>
            {activeStudents.map((s) => (
              <option key={s.studentId} value={s.studentId}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            style={box}
          >
            <option value="">템플릿 선택</option>
            {templates.map((t) => (
              <option key={t.templateId} value={t.templateId}>
                {t.name} ({t.items.length}개 항목)
              </option>
            ))}
          </select>
          <button type="submit" style={primaryBtn}>
            오늘 날짜로 배정
          </button>
        </form>
        {assignMsg && <p style={{ fontSize: 13, color: colors.blue, marginTop: 8 }}>{assignMsg}</p>}
      </div>

      <div style={{ ...card, padding: 18, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10, color: colors.navy }}>2. 오늘 체크리스트 보기</h2>
        <select value={viewStudentId} onChange={(e) => setViewStudentId(e.target.value)} style={box}>
          <option value="">학생 선택</option>
          {activeStudents.map((s) => (
            <option key={s.studentId} value={s.studentId}>
              {s.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleCreateShareLink}
          style={{ marginTop: 10, ...smallGhostBtn, padding: "9px 14px", fontSize: 13, fontWeight: 700 }}
        >
          학부모 공유링크 만들기 (오늘 날짜)
        </button>
        {shareLinkMsg && <p style={{ fontSize: 13, marginTop: 6, color: colors.textSecondary }}>{shareLinkMsg}</p>}
        {shareLinkUrl && (
          <input
            readOnly
            value={shareLinkUrl}
            onFocus={(e) => e.target.select()}
            style={{ ...box, marginTop: 6, fontSize: 13 }}
          />
        )}
      </div>

      {todayData && (
        <div>
          <div
            style={{
              background: colors.blueLight,
              borderRadius: 8,
              overflow: "hidden",
              height: 16,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: todayData.progress + "%",
                background: colors.blueGradient,
                height: "100%",
              }}
            />
          </div>
          <p style={{ fontSize: 14, marginBottom: 16, color: colors.navy, fontWeight: 600 }}>진행률 {todayData.progress}%</p>

          {todayData.assignments.length === 0 && (
            <p style={{ color: colors.textSecondary }}>오늘 배정된 체크리스트가 없습니다.</p>
          )}

          {todayData.assignments.map((a) => (
            <div key={a.assignmentId} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => handleDeleteAssignment(a.assignmentId)}
                  style={smallDangerBtn}
                >
                  이 배정 전체 삭제
                </button>
              </div>
              {a.items.map((item) => (
                <div
                  key={item.assignedItemId}
                  style={{
                    ...card,
                    padding: 16,
                    marginBottom: 10,
                    background: item.completed ? colors.greenLight : colors.card,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: colors.navy }}>
                      {item.completed ? "✅ " : "⬜ "}
                      {item.title}
                    </div>
                    <button
                      type="button"
                      onClick={() => resetItem(item)}
                      style={smallDangerBtn}
                    >
                      초기화
                    </button>
                  </div>

                  {item.hasCheck && (
                    <label style={{ display: "flex", alignItems: "center", marginBottom: 8, fontSize: 14, color: colors.navy }}>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) =>
                          patchItem(item.assignedItemId, { checked: e.target.checked })
                        }
                        style={{ width: 20, height: 20, marginRight: 8 }}
                      />
                      체크 완료
                    </label>
                  )}

                  {item.hasCount && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <button
                        type="button"
                        onClick={() =>
                          patchItem(item.assignedItemId, {
                            currentCount: item.currentCount - 1,
                          })
                        }
                        disabled={item.currentCount <= 0}
                        style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg, cursor: "pointer" }}
                      >
                        -
                      </button>
                      <span style={{ color: colors.navy, fontWeight: 600 }}>
                        {item.currentCount} / {item.targetCount}회
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          patchItem(item.assignedItemId, {
                            currentCount: item.currentCount + 1,
                          })
                        }
                        style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: colors.blue, color: "#fff", cursor: "pointer" }}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {item.hasScore && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <input
                        type="number"
                        placeholder="점수"
                        defaultValue={item.score ?? ""}
                        onBlur={(e) =>
                          patchItem(item.assignedItemId, {
                            score: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        style={{ width: 80, padding: 8, borderRadius: 8, border: `1px solid ${colors.border}` }}
                      />
                      <span style={{ color: colors.textSecondary }}>/ {item.maxScore}점</span>
                    </div>
                  )}

                  {item.linkUrl && (
                    <a href={item.linkUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginBottom: 8, color: colors.blue, fontSize: 13 }}>
                      🔗 {item.linkLabel || "자료 열기"}
                    </a>
                  )}

                  {item.teachingVideo && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
                        🎓 학습영상: {item.teachingVideo.title}
                      </div>
                      <video controls src={item.teachingVideo.url} style={{ width: "100%", maxHeight: 360, borderRadius: 10 }} />
                    </div>
                  )}

                  {item.hasPhotoSubmission && <PhotoUploader assignedItemId={item.assignedItemId} onDone={function () { loadToday(viewStudentId); }} />}

                  {item.hasAudioSubmission && <AudioUploader assignedItemId={item.assignedItemId} onDone={function () { loadToday(viewStudentId); }} />}

                  {item.hasVideoSubmission && <VideoUploader assignedItemId={item.assignedItemId} onDone={function () { loadToday(viewStudentId); }} />}

                  {item.hasFileSubmission && <FileUploader assignedItemId={item.assignedItemId} onDone={function () { loadToday(viewStudentId); }} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
