"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors, fontFamily } from "./theme";

const tabs = [
  { href: "/admin-test", label: "홈", icon: "🏠" },
  { href: "/admin-test/classes", label: "수업", icon: "🏫" },
  { href: "/admin-test/students", label: "학생", icon: "🧑‍🎓" },
  { href: "/admin-test/activities", label: "활동", icon: "🧩" },
  { href: "/admin-test/template-builder", label: "템플릿", icon: "📋" },
  { href: "/admin-test/checklist", label: "배정/확인", icon: "✅" },
  { href: "/admin-test/status", label: "완료 현황", icon: "📅" },
  { href: "/admin-test/teaching-videos", label: "학습영상", icon: "🎬" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div
      style={{
        fontFamily,
        background: colors.card,
        borderBottom: `1px solid ${colors.border}`,
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <Link href="/admin-test" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: colors.blueGradient,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            B
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: colors.navy }}>BOSTON ENGLISH</div>
            <div style={{ fontSize: 10, color: colors.textSecondary }}>관리자</div>
          </div>
        </Link>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {tabs.map((tab) => {
            const active = tab.href === "/admin-test" ? pathname === "/admin-test" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  background: active ? colors.blueLight : "transparent",
                  color: active ? colors.blue : colors.textSecondary,
                }}
              >
                <span style={{ fontSize: 13 }}>{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
