import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// データベースへの接続設定じゃ
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

async function main() {
  // ユーザーを 1 件作ってみるぞ
  await prisma.user.create({
    data: { name: `修行者 ${new Date().toLocaleTimeString()}` },
  });

  // 全員表示してみるぞ
  const users = await prisma.user.findMany();
  console.log("現在のユーザー一覧:", users);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => Promise.all([prisma.$disconnect(), pool.end()]));
