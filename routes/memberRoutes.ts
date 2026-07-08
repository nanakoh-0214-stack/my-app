import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// メンバー追加
router.post("/groups/:id/members", async (req, res) => {
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

// メンバー削除
router.post("/members/:id/delete", async (req, res) => {
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

export default router;
