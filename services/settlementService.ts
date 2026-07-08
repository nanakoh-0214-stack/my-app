export function calculateSettlement(group) {
  // メンバーごとの収支を管理
  const balances: Record<number, number> = {};

  group.members.forEach(member => {
    balances[member.id] = 0;
  });

  // 各支払いの負担額を計算
  group.expenses.forEach(expense => {
    if (expense.shares.length === 0) return;

    const totalWeight = expense.shares.reduce(
      (sum, shareInfo) => sum + shareInfo.weight,
      0
    );

    const amounts = expense.shares.map(shareInfo => {
      const exactAmount = expense.amount * shareInfo.weight / totalWeight;
      const amount = Math.floor(exactAmount);

      return {
        memberId: shareInfo.memberId,
        amount,
        fraction: exactAmount - amount,
      };
    });

    // 端数処理
    let remaining = expense.amount - amounts.reduce((sum, item) => sum + item.amount, 0);
    amounts
      .sort((a, b) => b.fraction - a.fraction)
      .forEach(item => {
        if (remaining > 0) {
          item.amount++;
          remaining--;
        }
      });

    // 収支へ反映
    amounts.forEach(item => {
      balances[item.memberId] -= item.amount;
    });
    balances[expense.payerId] += expense.amount;
  });

  // メンバーごとの精算状況
  const settlements = group.members.map(member => ({
    name: member.name,
    paidAmount: group.expenses
      .filter(expense => expense.payerId === member.id)
      .reduce((sum, expense) => sum + expense.amount, 0),
    balance: balances[member.id],
  }));

  // 支払う側・受け取る側に分類
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

  // 精算内容を作成
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

  return {
    settlements,
    transfers,
  };
}