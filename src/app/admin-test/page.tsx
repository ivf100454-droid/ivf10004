"use client";

import { useState } from "react";

/**
 * 임시 테스트 페이지. 실제 관리자 대시보드 UI가 만들어지기 전까지,
 * /api/admin/auth/login이 정상 동작하는지 눈으로 확인하기 위한 용도.
 * 같은 origin(Next.js 앱 내부)에서 fetch하므로 CORS 문제가 없다.
 */
export default function AdminTestPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });
      const data = await res.json().catch(() => ({}));
      setResult(`HTTP ${res.status}\n\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setResult(`요청 실패: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>관리자 로그인 테스트</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          placeholder="아이디"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          style={{ padding: 10, fontSize: 16 }}
        />
        <input
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10, fontSize: 16 }}
        />
        <button type="submit" disabled={loading} style={{ padding: 12, fontSize: 16 }}>
          {loading ? "요청 중..." : "로그인 테스트"}
        </button>
      </form>
      {result && (
        <pre
          style={{
            marginTop: 20,
            padding: 12,
            background: "#f3f3f3",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            fontSize: 13,
          }}
        >
          {result}
        </pre>
      )}
    </div>
  );
}
