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
  const users = await prisma.user.findMany();
  res.render("index", { users });
});

// ユーザー追加：フォームから送られてきた名前を保存する
app.post("/users", async (req, res) => {
  const name = req.body.name;
  const age = Number(req.body.age); // 文字列で来るので数値に変換するぞ

  if (isNaN(age)) {
    res.status(400).send("年齢は数値でなければなりません。");
    return;
  }

  if (name) {
    // age も一緒に保存するように指定するのじゃ
    const newUser = await prisma.user.create({ data: { name, age } });
    console.log("追加:", newUser);
  }
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`サーバーが起動したぞ！ http://localhost:${PORT}`);
});
