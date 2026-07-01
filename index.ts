import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// Prisma の準備
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

const app = express();
const PORT = process.env.PORT || 8888;

// EJS を使う設定じゃ
app.set("view engine", "ejs");
app.set("views", "./views");
// フォームからの入力を受け取れるようにする設定じゃ
app.use(express.urlencoded({ extended: true }));

// トップページ：ユーザー一覧を表示する
app.get("/", async (req, res) => {
  const groups = await prisma.group.findMany({
    orderBy: {
      id: "asc",
    },
  });
res.render("index", { groups });
});

app.post("/groups", async (req, res) => {
  const name = req.body.name;

  if (name) {
    await prisma.group.create({
      data: {
        name,
      },
    });
  }

  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`サーバーが起動したぞ！ http://localhost:${PORT}`);
});
