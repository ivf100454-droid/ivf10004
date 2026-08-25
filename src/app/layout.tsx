export const metadata = {
  title: "보스턴영어 체크리스트",
  description: "매일 조금씩, 영어가 내 것이 되는 시간",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "보스턴영어",
  },
};

export const viewport = {
  themeColor: "#2F6FEB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="보스턴영어" />
        <meta name="theme-color" content="#2F6FEB" />
      </head>
      <body>{children}</body>
    </html>
  );
}
