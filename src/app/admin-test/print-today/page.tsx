"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { colors, fontFamily } from "../theme";

type ClassCol = { classId: string; name: string; activities: string[] };
type Data = { date: string; weekday: number; classes: ClassCol[] };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
// A4 가로 한 장에 한 줄로 넣을 최대 수업 수. 더 많으면 아래에 표를 이어서 만든다.
const COLS_PER_TABLE = 5;
const MIN_ROWS = 6;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function PrintTodayPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/print/today-classes", { cache: "no-store" });
        if (res.status === 401) {
          setError("관리자 로그인이 필요합니다. 배정/확인 화면에서 먼저 로그인해 주세요.");
          return;
        }
        if (!res.ok) {
          setError("오늘 수업 목록을 불러오지 못했습니다.");
          return;
        }
        setData(await res.json());
      } catch {
        setError("오늘 수업 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dateLabel = data
    ? `${data.date.replace(/-/g, ".")} (${WEEKDAYS[data.weekday]})`
    : "";

  return (
    <div className="print-root" style={{ maxWidth: 1100, margin: "24px auto", padding: 16, fontFamily }}>
      <style>{`
        @page { size: A4 landscape; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
          .print-root { margin: 0 !important; padding: 0 !important; max-width: none !important; }
          .print-sheet { box-shadow: none !important; border: none !important; padding: 0 !important; }
        }
        .print-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 18px; break-inside: avoid; page-break-inside: avoid; }
        .print-table th, .print-table td { border: 1.5px solid #333; padding: 8px 10px; font-size: 15px; color: #111; vertical-align: middle; }
        .print-table th { background: #F0F3F8; font-weight: 800; font-size: 16px; text-align: center; }
        .print-table td.num { width: 44px; text-align: center; font-weight: 700; }
        .print-table th.num { width: 44px; }
        .print-table td { height: 38px; word-break: keep-all; }
        @media print {
          .print-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <Link
          href="/admin-test/checklist"
          style={{ fontSize: 14, color: colors.blue, textDecoration: "none", fontWeight: 700 }}
        >
          ← 배정/확인으로
        </Link>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => window.print()}
          disabled={!data || data.classes.length === 0}
          style={{
            background: colors.blueGradient,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 22px",
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
            opacity: !data || data.classes.length === 0 ? 0.5 : 1,
          }}
        >
          🖨️ 프린트 / PDF 저장
        </button>
      </div>

      <div
        className="print-sheet"
        style={{ background: "#fff", borderRadius: 16, padding: 24, border: `1px solid ${colors.border}` }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#111" }}>보스턴영어 · 오늘 수업 체크리스트</h1>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#333" }}>{dateLabel}</span>
        </div>

        {loading && <p style={{ color: colors.textSecondary }}>불러오는 중…</p>}
        {error && <p style={{ color: colors.pink }}>{error}</p>}
        {data && data.classes.length === 0 && (
          <p style={{ color: colors.textSecondary }}>오늘 반 기본 배정이 있는 수업이 없습니다.</p>
        )}

        {data &&
          chunk(data.classes, Math.min(COLS_PER_TABLE, data.classes.length)).map((group, gi, all) => {
            const cols = all[0].length;
            const rowCount = Math.max(MIN_ROWS, ...group.map((c) => c.activities.length));
            return (
              <table key={gi} className="print-table">
                <thead>
                  <tr>
                    <th className="num">번호</th>
                    {group.map((c) => (
                      <th key={c.classId}>{c.name}</th>
                    ))}
                    {/* 마지막 표의 수업 수가 적어도 칸 너비를 같게 유지 */}
                    {Array.from({ length: cols - group.length }).map((_, i) => (
                      <th key={`e${i}`} style={{ background: "#fff" }} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: rowCount }).map((_, ri) => (
                    <tr key={ri}>
                      <td className="num">{ri + 1}</td>
                      {group.map((c) => (
                        <td key={c.classId}>{c.activities[ri] ?? ""}</td>
                      ))}
                      {Array.from({ length: cols - group.length }).map((_, i) => (
                        <td key={`e${i}`} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })}
      </div>
    </div>
  );
}
