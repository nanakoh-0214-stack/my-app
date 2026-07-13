import express from "express";
import groupRoutes from "./routes/groupRoutes";
import memberRoutes from "./routes/memberRoutes"
import expensesRoutes from "./routes/expenseRoutes"

const app = express();

// EJSの設定
app.set("view engine", "ejs");
app.set("views", "./views");

// formデータ取得
app.use(express.urlencoded({ extended: true }));

// 静的ファイル(css, js)
app.use(express.static("public"));

// routes登録
app.use(groupRoutes);
app.use(memberRoutes);
app.use(expensesRoutes);

export default app;
