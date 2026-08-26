import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * 학생 등록 현황을 엑셀(CSV)로 다운로드한다.
 * 별도 xlsx 라이브러리 없이, 엑셀에서 그대로 열리는 CSV + UTF-8 BOM으로 만들어
 * 한글이 깨지지 않게 한다.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const students = await prisma.student.findMany({
    include: {
      account: { select: { loginId: true, accountStatus: true } },
      currentClass: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const header = ["이름", "아이디", "수업", "학생 상태", "계정 상태", "등록일"];
  const rows = students.map((s) => [
    s.name,
    s.account?.loginId ?? "",
    s.currentClass?.name ?? "배치 보류",
    s.studentStatus === "withdrawn" ? "퇴원" : "재학",
    s.account?.accountStatus === "disabled" ? "비활성" : "활성",
    s.createdAt.toISOString().slice(0, 10),
  ]);

  const csv = [header, ...rows].map((row) => row.map((v) => csvEscape(String(v))).join(",")).join("\r\n");
  const bom = "\uFEFF";

  return new NextResponse(bom + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students.csv"`,
    },
  });
}
