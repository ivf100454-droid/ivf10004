import AdminNav from "./AdminNav";
import { colors, fontFamily } from "./theme";

/**
 * /admin-test 하위 모든 화면에 공통으로 상단 네비게이션(AdminNav)을 붙여준다.
 * 각 화면(page.tsx)은 그대로 두고, 이 레이아웃이 감싸주기만 하므로
 * 기존 로그인/데이터 로직은 전혀 건드리지 않는다.
 */
export default function AdminTestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily, minHeight: "100vh", background: colors.bg }}>
      <AdminNav />
      {children}
    </div>
  );
}
