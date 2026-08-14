// 배포 직전(preDeploy)에 자동 실행되는 관리자 계정 시딩 스크립트.
// administrators 테이블이 이미 비어있지 않으면 아무 것도 하지 않고 조용히 종료한다 —
// 즉 여러 번 재배포돼도 중복 생성되지 않는다(최초 1회만 실제로 계정을 만든다).
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const BCRYPT_ROUNDS = 12; // src/lib/auth.ts와 동일한 값 유지

async function main() {
  const prisma = new PrismaClient();
  try {
    const existingCount = await prisma.administrator.count();
    if (existingCount > 0) {
      console.log("[seed-admin] 관리자 계정이 이미 존재합니다. 시딩을 건너뜁니다.");
      return;
    }

    const name = process.env.SEED_ADMIN_NAME;
    const loginId = process.env.SEED_ADMIN_LOGIN_ID;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!name || !loginId || !password) {
      console.log("[seed-admin] SEED_ADMIN_* 환경변수가 없어 시딩을 건너뜁니다.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const admin = await prisma.administrator.create({
      data: { name, loginId, passwordHash },
    });

    console.log(`[seed-admin] 관리자 계정 생성 완료: ${admin.loginId}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed-admin] 실패:", err);
  process.exit(1);
});
