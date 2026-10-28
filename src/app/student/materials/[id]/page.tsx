"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { colors, fontFamily } from "../../theme";
import MaterialsView from "../../MaterialsView";
import type { ItemMaterials } from "../../MaterialsButton";

/** 학생용 "자료열기" 화면 — 선생님이 활동에 넣어둔 영상·사진·파일·링크를 모아 보여준다. */
export default function MaterialsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [title, setTitle] = useState("");
  const [materials, setMaterials] = useState<ItemMaterials | null>(null);

  useEffect(() => {
    fetch(`/api/student/assigned-items/${params.id}/materials`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const d = await r.json();
        setTitle(d.title || "");
        setMaterials(d.materials || null);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [params.id]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/student/checklist");
  }

  return (
    <div style={{ fontFamily, minHeight: "100vh", background: colors.bg, paddingBottom: 40 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={goBack} style={{ fontSize: 20, color: colors.navy, background: "none", border: "none" }}>
            ‹
          </button>
          <div style={{ fontSize: 17, fontWeight: 800, color: colors.navy }}>자료열기</div>
          <span style={{ width: 20 }} />
        </div>

        {title && (
          <div style={{ fontSize: 18, fontWeight: 800, color: colors.navy, margin: "0 4px 14px" }}>📂 {title}</div>
        )}

        {state === "loading" && (
          <div style={{ textAlign: "center", color: colors.textSecondary, fontSize: 14, padding: 40 }}>불러오는 중...</div>
        )}
        {state === "error" && (
          <div style={{ background: colors.card, borderRadius: 16, padding: 24, textAlign: "center", color: colors.textSecondary, fontSize: 14 }}>
            자료를 불러오지 못했어요. 다시 시도해주세요.
          </div>
        )}
        {state === "ok" && !materials && (
          <div style={{ background: colors.card, borderRadius: 16, padding: 24, textAlign: "center", color: colors.textSecondary, fontSize: 14 }}>
            이 활동에는 선생님 자료가 없어요.
          </div>
        )}
        {state === "ok" && <MaterialsView materials={materials} />}

        <button
          onClick={goBack}
          style={{
            width: "100%",
            padding: 15,
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            background: colors.blue,
            border: "none",
            borderRadius: 14,
            marginTop: 4,
          }}
        >
          돌아가기
        </button>
      </div>
    </div>
  );
}
