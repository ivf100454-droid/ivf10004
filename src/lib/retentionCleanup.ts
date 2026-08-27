import { prisma } from "@/lib/db";
import { deleteFromR2 } from "@/lib/storage";
import { getAcademyToday } from "@/lib/timezone";

const RETENTION_DAYS = 30;

/** 오늘로부터 30일 전 날짜(그보다 이전 날짜의 기록이 정리 대상). */
export function getRetentionCutoffDate(): Date {
  const todayStr = getAcademyToday();
  const today = new Date(`${todayStr}T00:00:00.000Z`);
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
  return cutoff;
}

/** 보존기간이 지났고 보존 잠금이 안 걸린, 정리 대상 배정 목록을 가져온다. */
export async function findRetentionCandidates() {
  const cutoff = getRetentionCutoffDate();
  return prisma.checklistAssignment.findMany({
    where: { checklistDate: { lt: cutoff }, preservedByAdmin: false },
    include: { student: { select: { name: true } } },
    orderBy: { checklistDate: "asc" },
  });
}

/**
 * 배정 1건을 정리한다: 연결된 제출 파일을 R2에서 먼저 지우고, 전부 성공해야만 DB
 * 레코드(배정+항목+제출기록+파일메타)를 지운다. 파일 삭제가 하나라도 실패하면 DB는
 * 그대로 두고 실패로 기록한다 — 다음 실행 때 같은 조건으로 다시 잡혀서 자동 재시도된다.
 */
async function cleanupOneAssignment(
  assignmentId: string,
  triggeredBy: "manual" | "cron"
): Promise<{ status: "success" | "failed"; deletedFileCount: number; detail?: string }> {
  const assignment = await prisma.checklistAssignment.findUnique({
    where: { assignmentId },
    include: {
      student: { select: { name: true } },
      items: {
        include: {
          photoSubmissions: { include: { file: true } },
          audioSubmissions: { include: { file: true } },
          videoSubmissions: { include: { file: true } },
          fileSubmissions: { include: { file: true } },
        },
      },
    },
  });
  if (!assignment) return { status: "success", deletedFileCount: 0 };

  const fileMap = new Map<string, string>(); // fileId -> storageKey
  for (const item of assignment.items) {
    for (const s of item.photoSubmissions) fileMap.set(s.file.fileId, s.file.storageKey);
    for (const s of item.audioSubmissions) fileMap.set(s.file.fileId, s.file.storageKey);
    for (const s of item.videoSubmissions) fileMap.set(s.file.fileId, s.file.storageKey);
    for (const s of item.fileSubmissions) fileMap.set(s.file.fileId, s.file.storageKey);
  }

  const failedKeys: string[] = [];
  for (const [, storageKey] of fileMap) {
    try {
      await deleteFromR2(storageKey);
    } catch (err) {
      failedKeys.push(storageKey);
    }
  }

  if (failedKeys.length > 0) {
    await prisma.retentionAuditLog.create({
      data: {
        assignmentId: assignment.assignmentId,
        studentId: assignment.studentId,
        studentName: assignment.student.name,
        checklistDate: assignment.checklistDate,
        status: "failed",
        deletedFileCount: fileMap.size - failedKeys.length,
        detail: `파일 삭제 실패 (${failedKeys.length}건, 다음 실행 때 재시도됩니다): ${failedKeys.join(", ")}`,
        triggeredBy,
      },
    });
    return { status: "failed", deletedFileCount: fileMap.size - failedKeys.length, detail: "파일 삭제 실패" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.checklistAssignment.delete({ where: { assignmentId: assignment.assignmentId } });
    if (fileMap.size > 0) {
      await tx.fileMetadata.deleteMany({ where: { fileId: { in: Array.from(fileMap.keys()) } } });
    }
  });

  await prisma.retentionAuditLog.create({
    data: {
      assignmentId: assignment.assignmentId,
      studentId: assignment.studentId,
      studentName: assignment.student.name,
      checklistDate: assignment.checklistDate,
      status: "success",
      deletedFileCount: fileMap.size,
      triggeredBy,
    },
  });

  return { status: "success", deletedFileCount: fileMap.size };
}

export async function runRetentionCleanup(params: { dryRun: boolean; triggeredBy: "manual" | "cron" }) {
  const cutoff = getRetentionCutoffDate();
  const candidates = await findRetentionCandidates();

  if (params.dryRun) {
    return {
      dryRun: true,
      cutoffDate: cutoff.toISOString().slice(0, 10),
      eligibleCount: candidates.length,
      candidates: candidates.map((c) => ({
        assignmentId: c.assignmentId,
        studentName: c.student.name,
        date: c.checklistDate.toISOString().slice(0, 10),
      })),
    };
  }

  let successCount = 0;
  let failedCount = 0;
  const failedDetails: { studentName: string; date: string; detail?: string }[] = [];

  for (const c of candidates) {
    const result = await cleanupOneAssignment(c.assignmentId, params.triggeredBy);
    if (result.status === "success") {
      successCount += 1;
    } else {
      failedCount += 1;
      failedDetails.push({ studentName: c.student.name, date: c.checklistDate.toISOString().slice(0, 10), detail: result.detail });
    }
  }

  return {
    dryRun: false,
    cutoffDate: cutoff.toISOString().slice(0, 10),
    totalCandidates: candidates.length,
    successCount,
    failedCount,
    failedDetails,
  };
}
