"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors } from "./theme";

const tabs = [
  { href: "/student", label: "홈", icon: "🏠" },
  { href: "/student/checklist", label: "체크리스트", icon: "🗓️" },
  { href: "/student/history", label: "기록", icon: "📊" },
  { href: "/student/profile", label: "내정보", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.card,
        borderTop: `1px solid ${colors.border}`,
        display: "flex",
        justifyContent: "space-around",
        padding: "8px 0 calc(8px + env(safe-area-inset-bottom))",
        zIndex: 20,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.href === "/student" ? pathname === "/student" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              textDecoration: "none",
              color: active ? colors.blue : colors.textMuted,
              fontSize: 11,
              fontWeight: active ? 700 : 500,
              width: 72,
            }}
          >
            <span style={{ fontSize: 20, filter: active ? "none" : "grayscale(60%) opacity(0.7)" }}>{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
