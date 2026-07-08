import { Router } from "express";
import { prisma } from "../lib/prisma";
import { calculateSettlement } from "../services/settlementService";

const router = Router();

// グループ一覧
router.get("/", async (req, res) => {
  const groups = await prisma.group.findMany({
    orderBy: {
      id: "asc",
    },
  });
  res.render("index", { groups });
});

// グループ詳細
router.get("/groups/:id", async (req, res) => {
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

  const { settlements, transfers, } = calculateSettlement(group);

  res.render("group", {
    group,
    totalAmount,
    memberCount,
    settlements,
    transfers,
  });
});

// グループの追加
router.post("/groups", async (req, res) => {
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

// グループの削除
router.post("/groups/:id/delete", async (req, res) => {
  const groupId = Number(req.params.id);
  await prisma.group.delete({
	where: {
	  id: groupId,
	},
  });
  res.redirect("/");
});

export default router;
