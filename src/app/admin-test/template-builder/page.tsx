"use client";

import { useEffect, useState } from "react";

type ItemDraft = {
  uiId: string;
  title: string;
  hasCheck: boolean;
  hasCount: boolean;
  targetCount: string;
  hasScore: boolean;
  maxScore: string;
  hasLink: boolean;
  linkUrl: string;
  linkLabel: string;
  teachingVideoId: string;
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
  requiredFeatures: Record<string, boolean>;
};

type Template = {
  templateId: string;
  name: string;
  items: {
    templateItemId: string;
    title: string;
    hasCheck: boolean;
    hasCount: boolean;
    targetCount: number | null;
    hasScore: boolean;
    maxScore: number | null;
    linkUrl: string | null;
    teachingVideoId: string | null;
    hasPhotoSubmission: boolean;
    hasAudioSubmission: boolean;
    hasVideoSubmission: boolean;
  }[];
};

type TeachingVideo = { videoId: string; title: string };

const FEATURE_LABELS: Record<string, string> = {
  check: "☑ 체크",
  count: "🔢 횟수",
  score: "💯 점수",
  photoSubmission: "📷 사진제출",
  audioSubmission: "🎤 음성제출",
  videoSubmission: "🎬 영상제출",
};

function newItem(): ItemDraft {
  return {
    uiId: Math.random().toString(36).slice(2),
    title: "",
    hasCheck: true,
    hasCount: false,
    targetCount: "3",
    hasScore: false,
    maxScore: "100",
    hasLink: false,
    linkUrl: "",
    linkLabel: "",
    teachingVideoId: "",
    hasPhotoSubmission: false,
    hasAudioSubmission: false,
    hasVideoSubmission: false,
    requiredFeatures: { check: true },
  };
}

export default function TemplateBuilderPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [templateName, setTemplateName] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([newItem()]);
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [teachingVideos, setTeachingVideos] = useState<TeachingVideo[]>([]);

  async function refresh() {
    const res = await fetch("/api/admin/templates");
    if (res.status === 401) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    setTemplates(await res.json());
    const vRes = await fetch("/api/admin/teaching-videos");
    if (vRes.ok) {
      const vData = await vRes.json();
      setTeachingVideos(vData.map((v: { videoId: string; title: string }) => ({ videoId: v.videoId, title: v.title })));
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setLoginMsg(data.error || "로그인 실패");
    }
  }

  function updateItem(uiId: string, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it) => (it.uiId === uiId ? { ...it, ...patch } : it)));
  }

  function toggleFeature(uiId: string, feature: string, enabled: boolean) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.uiId !== uiId) return it;
        const next = { ...it };
        if (feature === "check") next.hasCheck = enabled;
        if (feature === "count") next.hasCount = enabled;
        if (feature === "score") next.hasScore = enabled;
        if (feature === "photoSubmission") next.hasPhotoSubmission = enabled;
        if (feature === "audioSubmission") next.hasAudioSubmission = enabled;
        if (feature === "videoSubmission") next.hasVideoSubmission = enabled;
        if (!enabled) {
          const req = { ...next.requiredFeatures };
          delete req[feature];
          next.requiredFeatures = req;
        }
        return next;
      })
    );
  }

  function toggleRequired(uiId: string, feature: string, required: boolean) {
    setItems((prev) =>
      prev.map((it) =>
        it.uiId === uiId
          ? { ...it, requiredFeatures: { ...it.requiredFeatures, [feature]: required } }
          : it
      )
    );
  }

  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }

  function removeItem(uiId: string) {
    setItems((prev) => prev.filter((it) => it.uiId !== uiId));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg("");
    setSaving(true);
    try {
      const payload = {
        name: templateName,
        items: items.map((it) => ({
          title: it.title,
          hasCheck: it.hasCheck,
          hasCount: it.hasCount,
          targetCount: it.hasCount ? Number(it.targetCount) : undefined,
          hasScore: it.hasScore,
          maxScore: it.hasScore ? Number(it.maxScore) : undefined,
          linkUrl: it.hasLink ? it.linkUrl : undefined,
          linkLabel: it.hasLink ? it.linkLabel : undefined,
          teachingVideoId: it.teachingVideoId || undefined,
          hasPhotoSubmission: it.hasPhotoSubmission,
          hasAudioSubmission: it.hasAudioSubmission,
          hasVideoSubmission: it.hasVideoSubmission,
          requiredFeatures: Object.keys(it.requiredFeatures).filter((k) => it.requiredFeatures[k]),
        })),
      };
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSaveMsg(`"${data.name}" 템플릿 생성됨 (항목 ${data.items.length}개)`);
        setTemplateName("");
        setItems([newItem()]);
        await refresh();
      } else {
        setSaveMsg(`실패: ${data.error}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const box: React.CSSProperties = { padding: 8, fontSize: 15, width: "100%", boxSizing: "border-box" };

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto", padding: 16, fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>관리자 로그인</h1>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} style={box} />
          <input
            placeholder="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={box}
          />
          <button type="submit" style={{ padding: 12, fontSize: 16 }}>
            로그인
          </button>
        </form>
        {loginMsg && <p style={{ color: "crimson" }}>{loginMsg}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "24px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>체크리스트 템플릿 만들기</h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
        📷🎤🎬 사진·음성·영상 제출과 🎓 학습영상 연결 모두 실제로 작동합니다.
      </p>

      <form onSubmit={handleSave}>
        <input
          placeholder="템플릿 이름 (예: 팝송 학습)"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          style={{ ...box, marginBottom: 16 }}
          required
        />

        {items.map((it, idx) => {
          const enabledFeatures = [
            it.hasCheck && "check",
            it.hasCount && "count",
            it.hasScore && "score",
            it.hasPhotoSubmission && "photoSubmission",
            it.hasAudioSubmission && "audioSubmission",
            it.hasVideoSubmission && "videoSubmission",
          ].filter(Boolean) as string[];

          return (
            <div
              key={it.uiId}
              style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}
            >
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  placeholder={`항목 ${idx + 1} 제목 (예: 팝송 부르기)`}
                  value={it.title}
                  onChange={(e) => updateItem(it.uiId, { title: e.target.value })}
                  style={{ ...box, flex: 1 }}
                  required
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(it.uiId)} style={{ padding: "0 10px" }}>
                    삭제
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8, fontSize: 14 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={it.hasCheck}
                    onChange={(e) => toggleFeature(it.uiId, "check", e.target.checked)}
                  />{" "}
                  ☑ 체크
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={it.hasCount}
                    onChange={(e) => toggleFeature(it.uiId, "count", e.target.checked)}
                  />{" "}
                  🔢 횟수
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={it.hasScore}
                    onChange={(e) => toggleFeature(it.uiId, "score", e.target.checked)}
                  />{" "}
                  💯 점수
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={it.hasLink}
                    onChange={(e) => updateItem(it.uiId, { hasLink: e.target.checked })}
                  />{" "}
                  🔗 링크
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={it.hasPhotoSubmission}
                    onChange={(e) => toggleFeature(it.uiId, "photoSubmission", e.target.checked)}
                  />{" "}
                  📷 사진제출
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={it.hasAudioSubmission}
                    onChange={(e) => toggleFeature(it.uiId, "audioSubmission", e.target.checked)}
                  />{" "}
                  🎤 음성제출
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={it.hasVideoSubmission}
                    onChange={(e) => toggleFeature(it.uiId, "videoSubmission", e.target.checked)}
                  />{" "}
                  🎬 영상제출
                </label>
              </div>

              {it.hasCount && (
                <input
                  type="number"
                  min={1}
                  placeholder="목표 횟수"
                  value={it.targetCount}
                  onChange={(e) => updateItem(it.uiId, { targetCount: e.target.value })}
                  style={{ ...box, marginBottom: 8, maxWidth: 140 }}
                />
              )}
              {it.hasScore && (
                <input
                  type="number"
                  min={1}
                  placeholder="만점"
                  value={it.maxScore}
                  onChange={(e) => updateItem(it.uiId, { maxScore: e.target.value })}
                  style={{ ...box, marginBottom: 8, maxWidth: 140 }}
                />
              )}
              {it.hasLink && (
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    placeholder="링크 URL (https://...)"
                    value={it.linkUrl}
                    onChange={(e) => updateItem(it.uiId, { linkUrl: e.target.value })}
                    style={{ ...box, flex: 2 }}
                  />
                  <input
                    placeholder="버튼 이름 (예: 팝송 보기)"
                    value={it.linkLabel}
                    onChange={(e) => updateItem(it.uiId, { linkLabel: e.target.value })}
                    style={{ ...box, flex: 1 }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 14, display: "block", marginBottom: 4 }}>
                  🎓 학습영상 연결 (선택)
                </label>
                <select
                  value={it.teachingVideoId}
                  onChange={(e) => updateItem(it.uiId, { teachingVideoId: e.target.value })}
                  style={box}
                >
                  <option value="">연결 안 함</option>
                  {teachingVideos.map((v) => (
                    <option key={v.videoId} value={v.videoId}>
                      {v.title}
                    </option>
                  ))}
                </select>
                {teachingVideos.length === 0 && (
                  <p style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                    아직 업로드된 학습영상이 없습니다 (학습영상 라이브러리 화면에서 먼저 업로드하세요).
                  </p>
                )}
              </div>

              {enabledFeatures.length > 0 && (
                <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                  완료조건으로 포함할 기능:{" "}
                  {enabledFeatures.map((f) => (
                    <label key={f} style={{ marginRight: 10 }}>
                      <input
                        type="checkbox"
                        checked={!!it.requiredFeatures[f]}
                        onChange={(e) => toggleRequired(it.uiId, f, e.target.checked)}
                      />{" "}
                      {FEATURE_LABELS[f]}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <button type="button" onClick={addItem} style={{ padding: 10, marginBottom: 16, width: "100%" }}>
          + 항목 추가
        </button>

        <button type="submit" disabled={saving} style={{ padding: 14, fontSize: 16, width: "100%" }}>
          {saving ? "저장 중..." : "템플릿 저장"}
        </button>
      </form>
      {saveMsg && <p style={{ marginTop: 8 }}>{saveMsg}</p>}

      <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 8 }}>기존 템플릿</h2>
      {templates.map((t) => (
        <div key={t.templateId} style={{ marginBottom: 16 }}>
          <strong>{t.name}</strong>
          <ul style={{ paddingLeft: 20, fontSize: 14 }}>
            {t.items.map((it) => {
              const tags = [
                it.hasCheck && "☑",
                it.hasCount && `🔢${it.targetCount}회`,
                it.hasScore && `💯/${it.maxScore}`,
                it.linkUrl && "🔗",
                it.teachingVideoId && "🎓",
                it.hasPhotoSubmission && "📷",
                it.hasAudioSubmission && "🎤",
                it.hasVideoSubmission && "🎬",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <li key={it.templateItemId}>
                  {it.title} — {tags}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {templates.length === 0 && <p style={{ color: "#888" }}>아직 템플릿이 없습니다.</p>}
    </div>
  );
}
