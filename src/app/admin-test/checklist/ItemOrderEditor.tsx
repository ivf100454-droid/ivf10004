"use client";

import { useRef, useState } from "react";
import { colors } from "../theme";

type Item = { templateItemId: string; title: string };
type Option = { id: string; name: string };

const box: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  fontSize: 14,
  background: "#fff",
};

/**
 * 체크리스트 활동순서 수정.
 * 1) 학생 선택 → 그 학생의 "개별 추가" 활동 순서
 * 2) 클래스 선택 → 반 기본 활동 순서 (반 학생 전원)
 * ⠿ 손잡이로 끌어서 순서를 바꾸고 "완료"를 눌러야 저장된다.
 */
export default function ItemOrderEditor(props: {
  students: Option[];
  classes: Option[];
  primaryBtn: React.CSSProperties;
  ghostBtn: React.CSSProperties;
  onSaved?: () => void;
}) {
  const [mode, setMode] = useState<"student" | "class">("student");
  const [targetId, setTargetId] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  // 완료 전: 제거 표시만 한 활동 (되돌리기 가능)
  const [pendingRemoved, setPendingRemoved] = useState<{ item: Item; index: number }[]>([]);
  // 완료 후: 방금 실제로 제거된 활동 (서버에서 받은 원본 데이터, 되돌리기용)
  const [lastRemoved, setLastRemoved] = useState<{ snap: any[]; positions: Record<string, number> } | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  async function load(m: "student" | "class", id: string) {
    setMsg("");
    setItems([]);
    setTemplateId(null);
    setPendingRemoved([]);
    setLastRemoved(null);
    if (!id) return;
    setLoading(true);
    const res = await fetch("/api/admin/item-order?" + (m === "student" ? "studentId=" : "classId=") + id);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMsg("불러오지 못했어요: " + (data.error || ""));
      return;
    }
    setTemplateId(data.templateId);
    setItems(data.items || []);
    setOriginal((data.items || []).map((i: Item) => i.templateItemId).join(","));
  }

  function switchMode(m: "student" | "class") {
    setMode(m);
    setTargetId("");
    load(m, "");
  }

  function onMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (!dragId) return;
    const y = e.clientY;
    if (y < 70) window.scrollBy(0, -12);
    else if (y > window.innerHeight - 70) window.scrollBy(0, 12);
    const others = items.filter((x) => x.templateItemId !== dragId);
    let to = others.findIndex((x) => {
      const el = rowRefs.current.get(x.templateItemId);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    if (to < 0) to = others.length;
    const dragged = items.find((x) => x.templateItemId === dragId)!;
    const next = others.slice();
    next.splice(to, 0, dragged);
    if (next.every((x, i) => x.templateItemId === items[i].templateItemId)) return;
    setItems(next);
  }

  function removeItem(it: Item) {
    const original_index = original.split(",").indexOf(it.templateItemId);
    setItems(items.filter((x) => x.templateItemId !== it.templateItemId));
    setPendingRemoved([...pendingRemoved, { item: it, index: original_index < 0 ? items.length : original_index }]);
    setMsg("");
  }

  function undoPending(it: Item) {
    const entry = pendingRemoved.find((p) => p.item.templateItemId === it.templateItemId);
    if (!entry) return;
    const next = items.slice();
    next.splice(Math.min(entry.index, next.length), 0, it);
    setItems(next);
    setPendingRemoved(pendingRemoved.filter((p) => p.item.templateItemId !== it.templateItemId));
  }

  async function post(payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/item-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function save() {
    if (!templateId) return;
    const ids = items.map((i) => i.templateItemId);
    if (ids.join(",") === original) {
      setMsg("바뀐 내용이 없어요.");
      return;
    }
    if (ids.length === 0) {
      setMsg("활동을 하나 이상 남겨주세요. 전부 없애려면 위의 배정 해제를 사용하세요.");
      return;
    }
    if (pendingRemoved.length > 0) {
      const names = pendingRemoved.map((p) => "· " + p.item.title).join("\n");
      const who = mode === "student" ? "이 학생" : "이 반 학생 전원";
      if (!window.confirm(pendingRemoved.length + "개 활동을 제거할까요?\n\n" + names + "\n\n" + who + "의 오늘 체크리스트에서도 바로 빠지고, 그 활동에 오늘 한 체크·제출 기록도 지워집니다.")) return;
    }
    setMsg("저장 중...");
    const positions: Record<string, number> = {};
    pendingRemoved.forEach((p) => (positions[p.item.templateItemId] = p.index));
    const { ok, data } = await post({ templateItemIds: ids });
    if (ok) {
      setOriginal(ids.join(","));
      setPendingRemoved([]);
      const removed = Array.isArray(data.removed) ? data.removed : [];
      setLastRemoved(removed.length > 0 ? { snap: removed, positions } : null);
      setMsg(
        "✅ 저장되었습니다. (오늘 체크리스트와 내일부터 모두 반영" +
          (removed.length > 0 ? ", 활동 " + removed.length + "개 제거" : "") +
          ")"
      );
      props.onSaved?.();
    } else {
      setMsg("저장 실패: " + (data.error || ""));
    }
  }

  async function undoLastRemoved() {
    if (!lastRemoved) return;
    const next = items.slice();
    const restoredItems = lastRemoved.snap
      .map((r: any) => ({ item: { templateItemId: r.templateItemId, title: r.title } as Item, index: lastRemoved.positions[r.templateItemId] ?? next.length }))
      .sort((a, b) => a.index - b.index);
    for (const r of restoredItems) next.splice(Math.min(r.index, next.length), 0, r.item);
    setMsg("되돌리는 중...");
    const { ok, data } = await post({ templateItemIds: next.map((i) => i.templateItemId), restore: lastRemoved.snap });
    if (ok) {
      setItems(next);
      setOriginal(next.map((i) => i.templateItemId).join(","));
      setLastRemoved(null);
      setMsg("↩ 되돌렸습니다. 오늘 체크리스트에도 다시 들어갔어요 (지워진 기록은 새로 시작).");
      props.onSaved?.();
    } else {
      setMsg("되돌리기 실패: " + (data.error || ""));
    }
  }

  const changed = items.map((i) => i.templateItemId).join(",") !== original;
  const options = mode === "student" ? props.students : props.classes;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => switchMode("student")} style={mode === "student" ? props.primaryBtn : props.ghostBtn}>
          1) 학생 선택
        </button>
        <button type="button" onClick={() => switchMode("class")} style={mode === "class" ? props.primaryBtn : props.ghostBtn}>
          2) 클래스 선택
        </button>
      </div>

      <select
        value={targetId}
        onChange={(e) => {
          setTargetId(e.target.value);
          load(mode, e.target.value);
        }}
        style={box}
      >
        <option value="">{mode === "student" ? "학생 선택" : "클래스 선택"}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {mode === "student" && (
        <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6 }}>
          학생의 ➕ 개별 추가 활동 순서만 바뀌어요. 🏫 반 기본 활동은 2) 클래스 선택에서 바꿔주세요.
        </p>
      )}

      {loading && <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 10 }}>불러오는 중...</p>}
      {!loading && targetId && !templateId && (
        <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 10 }}>
          {mode === "student" ? "이 학생에게 개별 배정된 활동이 없어요." : "이 반에 배정된 활동이 없어요."}
        </p>
      )}

      {(items.length > 0 || pendingRemoved.length > 0) && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>왼쪽 ⠿ 를 잡고 끌어서 순서를 바꾼 뒤 완료를 눌러주세요.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((it, idx) => {
              const dragging = dragId === it.templateItemId;
              return (
                <div
                  key={it.templateItemId}
                  ref={(el) => {
                    if (el) rowRefs.current.set(it.templateItemId, el);
                    else rowRefs.current.delete(it.templateItemId);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "#fff",
                    border: `1.5px solid ${dragging ? colors.blue : colors.border}`,
                    borderRadius: 10,
                    boxShadow: dragging ? "0 6px 18px rgba(0,0,0,0.18)" : undefined,
                    transform: dragging ? "scale(1.02)" : undefined,
                    position: "relative",
                    zIndex: dragging ? 2 : 1,
                  }}
                >
                  <span
                    title="끌어서 순서 바꾸기"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDragId(it.templateItemId);
                    }}
                    onPointerMove={onMove}
                    onPointerUp={() => setDragId(null)}
                    onPointerCancel={() => setDragId(null)}
                    style={{
                      padding: "12px 10px 12px 14px",
                      fontSize: 18,
                      color: colors.textMuted,
                      cursor: dragging ? "grabbing" : "grab",
                      touchAction: "none",
                      userSelect: "none",
                    }}
                  >
                    ⠿
                  </span>
                  <span style={{ fontSize: 14, color: colors.navy, padding: "10px 12px 10px 0" }}>
                    <strong style={{ color: colors.blue, marginRight: 6 }}>{idx + 1}.</strong>
                    {it.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(it)}
                    style={{
                      marginLeft: "auto",
                      marginRight: 10,
                      flexShrink: 0,
                      padding: "5px 10px",
                      borderRadius: 8,
                      border: `1px solid ${colors.pink}`,
                      background: "#fff",
                      color: colors.pink,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ✕ 제거
                  </button>
                </div>
              );
            })}
          </div>
          {pendingRemoved.length > 0 && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "#fdeef2" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.pink, marginBottom: 6 }}>
                제거할 활동 (완료를 눌러야 적용돼요)
              </div>
              {pendingRemoved.map((p) => (
                <div key={p.item.templateItemId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 4 }}>
                  <span style={{ textDecoration: "line-through", color: colors.textSecondary }}>{p.item.title}</span>
                  <button
                    type="button"
                    onClick={() => undoPending(p.item)}
                    style={{ ...props.ghostBtn, marginLeft: "auto", fontSize: 12, padding: "4px 10px" }}
                  >
                    ↩ 되돌리기
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!changed}
            style={{ ...props.primaryBtn, width: "100%", marginTop: 12, opacity: changed ? 1 : 0.5 }}
          >
            완료
          </button>
        </div>
      )}
      {msg && <p style={{ fontSize: 13, color: colors.blue, marginTop: 8 }}>{msg}</p>}
      {lastRemoved && (
        <button type="button" onClick={undoLastRemoved} style={{ ...props.ghostBtn, marginTop: 6, fontSize: 13, fontWeight: 700 }}>
          ↩ 방금 제거한 활동 되돌리기 ({lastRemoved.snap.map((r: any) => r.title).join(", ")})
        </button>
      )}
    </div>
  );
}
