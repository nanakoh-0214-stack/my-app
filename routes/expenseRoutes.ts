import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// ======================
// 支払い編集画面
// ======================
router.get("/expenses/:id/edit", async (req, res) => {
  const expenseId = Number(req.params.id);

  const expense = await prisma.expense.findUnique({
    where: {
      id: expenseId,
    },
    include: {
      group: {
        include: {
          members: true,
        },
      },
      shares: true,
    },
  });

  if (!expense) {
    return res.status(404).send("支払いが見つかりません");
  }

  const paidAtLocal = expense.paidAt.toISOString().slice(0, 16);

  const useWeight = expense.shares.some(
    (share) => share.weight !== 1
  );

  res.render("editExpense", {
    group: expense.group,
    expense: {
      ...expense,
      paidAtLocal,
      useWeight,
    },
    formAction: `/expenses/${expense.id}/edit`,
    isEdit: true,
  });
});

// ======================
// 支払い更新
// ======================
router.post("/expenses/:id/edit", async (req, res) => {
  const expenseId = Number(req.params.id);

  const expense = await prisma.expense.findUnique({
    where: {
      id: expenseId,
    },
  });

  if (!expense) {
    return res.status(404).send("支払いが見つかりません");
  }

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
    : req.body.weights
      ? [Number(req.body.weights)]
      : [];

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: {
        id: expenseId,
      },
      data: {
        description,
        amount,
        payerId,
        paidAt,
      },
    });

    await tx.expenseShare.deleteMany({
      where: {
        expenseId,
      },
    });

    await tx.expenseShare.createMany({
      data: participantIds.map((memberId, index) => ({
        expenseId,
        memberId,
        weight: useWeight
          ? (weights[index] ?? 1)
          : 1,
      })),
    });
  });

  res.redirect(`/groups/${expense.groupId}`);
});

export default router;