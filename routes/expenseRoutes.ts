import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// 支払いの追加
router.post("/groups/:id/expenses", async (req, res) => {
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

// 支払いの削除
router.post("/expenses/:id/delete", async (req, res) => {
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

export default router;