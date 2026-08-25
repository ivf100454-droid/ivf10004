import AdminNav from "./AdminNav";
import { colors, fontFamily } from "./theme";

/**
 * /admin-test 하위 모든 화면에 공통으로 상단 네비게이션(AdminNav)을 붙여준다.
 * 각 화면(page.tsx)은 그대로 두고, 이 레이아웃이 감싸주기만 하므로
 * 기존 로그인/데이터 로직은 전혀 건드리지 않는다.
 *
 * metadata를 여기서 별도로 지정하면, /admin-test 하위 화면에서는
 * 루트 레이아웃의 학생용 manifest(/manifest.json) 대신 관리자용
 * manifest(/manifest-admin.json)를 쓰게 되어, "홈 화면에 추가"를 누르면
 * 관리자 홈(/admin-test)으로 바로 열리는 별도의 아이콘이 생긴다.
 */
export const metadata = {
  title: "보스턴영어 관리자",
  manifest: "/manifest-admin.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "보스턴영어 관리자",
  },
};

export default function AdminTestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily, minHeight: "100vh", background: colors.bg }}>
      <AdminNav />
      {children}
    </div>
  );
}
