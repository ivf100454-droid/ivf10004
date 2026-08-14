import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/adminAuth";

/**
 * 클래스 삭제. 소속 학생이 있으면 기본적으로 거부하고 학생 수를 반환한다.
 * 클라이언트가 강한 확인 UI를 거쳐 ?force=true로 다시 요청해야 실제 삭제된다.
 * (3번 요구사항: "학생이 있는 클래스를 삭제하려면 강한 확인 UI를 제공한다")
 *
 * DB 스키마에서 students.currentClassId → classes는 onDelete: SetNull 이므로,
 * 확인 절차를 우회해서 삭제 요청이 들어와도 학생 레코드 자체는 절대 깨지지 않는다
 * (이중 방어 — 클라이언트 확인은 UX이고, 무결성은 DB 제약이 최종 보장).
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });

  const force = req.nextUrl.searchParams.get("force") === "true";

  const studentCount = await prisma.student.count({
    where: { currentClassId: params.id },
  });

  if (studentCount > 0 && !force) {
    return NextResponse.json(
      {
        error: "confirmation_required",
        message: `이 클래스에 소속된 학생이 ${studentCount}명 있습니다. 정말 삭제하시겠습니까?`,
        studentCount,
      },
      { status: 409 }
    );
  }

  await prisma.class.delete({ where: { classId: params.id } });
  // onDelete: SetNull 덕분에 소속 학생들의 currentClassId는 자동으로 null이 되고,
  // 과거 checklist_assignments.class_id_snapshot은 이 테이블과 무관하므로 그대로 보존된다.
  return NextResponse.json({ ok: true });
}
