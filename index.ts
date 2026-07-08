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

app.get("/groups/:id", async (req, res) => {
  const id = Number(req.params.id);
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: true,
      expenses: {
        include: {
          payer: true,
          shares: {
            include: {
              member: true,
            },
          },
        },
        orderBy: {
          paidAt: "desc",
        },
      },
    },
  });
  if (!group) {
    return res.status(404).send("グループが見つかりません");
  }

  const totalAmount = group.expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const memberCount = group.members.length;

  const balances: Record<number, number> = {};

  group.members.forEach(member => {
    balances[member.id] = 0;
  });

  group.expenses.forEach(expense => {
    if (expense.shares.length === 0) return;

    const totalWeight = expense.shares.reduce(
      (sum, shareInfo) => sum + shareInfo.weight,
      0
    );

    const amounts = expense.shares.map(shareInfo => {
      const exactAmount =
        expense.amount *
        shareInfo.weight /
        totalWeight;

      return {
        memberId: shareInfo.memberId,
        amount: Math.floor(exactAmount),
        fraction: exactAmount - Math.floor(exactAmount),
      };
    });

    // 切り捨てによる不足分
    let remaining =
      expense.amount -
      amounts.reduce((sum, item) => sum + item.amount, 0);

    // 小数部分が大きい順に1円ずつ追加
    amounts
      .sort((a, b) => b.fraction - a.fraction)
      .forEach(item => {
        if (remaining > 0) {
          item.amount += 1;
          remaining--;
        }
      });

    // 負担額を反映
    amounts.forEach(item => {
      balances[item.memberId] -= item.amount;
    });

    // 支払者は立て替えた分を加算
    balances[expense.payerId] += expense.amount;
  });

  const settlements = group.members.map(member => ({
    name: member.name,
    paidAmount: group.expenses
      .filter(expense => expense.payerId === member.id)
      .reduce((sum, expense) => sum + expense.amount, 0),
    balance: balances[member.id],
  }));
  const creditors = settlements
    .filter(member => member.balance > 0)
    .map(member => ({
      name: member.name,
      balance: member.balance,
    }));
  const debtors = settlements
    .filter(member => member.balance < 0)
    .map(member => ({
      name: member.name,
      balance: -member.balance,
    }));

  const transfers: {
    from: string;
    to: string;
    amount: number;
  }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(
      debtors[i].balance,
      creditors[j].balance
    );
    transfers.push({
      from: debtors[i].name,
      to: creditors[j].name,
      amount,
    });
    debtors[i].balance -= amount;
    creditors[j].balance -= amount;
    if (debtors[i].balance <= 0) i++;
    if (creditors[j].balance <= 0) j++;
  }

  res.render("group", {
    group,
    totalAmount,
    memberCount,
    // amountPerPerson,
    settlements,
    transfers,
  });
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

app.post("/groups/:id/delete", async (req, res) => {
  const groupId = Number(req.params.id);
  await prisma.group.delete({
    where: {
      id: groupId,
    },
  });
  res.redirect("/");
});

app.post("/groups/:id/members", async (req, res) => {
  const groupId = Number(req.params.id);
  const name = req.body.name;
  if (name) {
    await prisma.member.create({
      data: {
        name,
        groupId,
      },
    });
  }
  res.redirect(`/groups/${groupId}`);
});

app.post("/members/:id/delete", async (req, res) => {
  const memberId = Number(req.params.id);
  // 削除前に所属グループを取得
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });
  if (!member) {
    return res.status(404).send("メンバーが見つかりません");
  }
  await prisma.member.delete({
    where: { id: memberId },
  });
  res.redirect(`/groups/${member.groupId}`);
});

app.post("/groups/:id/expenses", async (req, res) => {
  const groupId = Number(req.params.id);
  const description = req.body.description;
  const amount = Number(req.body.amount);
  const payerId = Number(req.body.payerId);
  const paidAt = new Date(req.body.paidAt);
  const participantIds = Array.isArray(req.body.participantIds)
    ? req.body.participantIds.map(Number)
    : req.body.participantIds
      ? [Number(req.body.participantIds)]
      : [];
  const useWeight = req.body.useWeight === "true";
  const weights = Array.isArray(req.body.weights)
    ? req.body.weights.map(Number)
    : [Number(req.body.weights)];
  await prisma.expense.create({
    data: {
      description,
      amount,
      payerId,
      groupId,
      paidAt,
      shares: {
        create: participantIds.map((id, index) => ({
          memberId: id,
          weight: useWeight
            ? weights[index]
            : 1,
        })),
      },
    },
  });
  res.redirect(`/groups/${groupId}`);
});

app.post("/expenses/:id/delete", async (req, res) => {
  const expenseId = Number(req.params.id);
  // 削除前にどのグループの支払いか取得
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });
  if (!expense) {
    return res.status(404).send("支払いが見つかりません");
  }
  await prisma.expense.delete({
    where: { id: expenseId },
  });
  res.redirect(`/groups/${expense.groupId}`);
});

app.listen(PORT, () => {
  console.log(`サーバーが起動したぞ！ http://localhost:${PORT}`);
});