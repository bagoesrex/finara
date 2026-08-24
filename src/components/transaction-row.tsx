import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BusFront,
  Coffee,
  Gamepad2,
  Receipt,
  ShoppingBag,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import type { Transaction } from "@/lib/mock-data";

const categoryIcons: Record<string, LucideIcon> = {
  "Food & Drink": Coffee,
  Transport: BusFront,
  Bills: Receipt,
  Shopping: ShoppingBag,
  Entertainment: Gamepad2,
  Salary: ArrowDownLeft,
  Freelance: WalletCards,
  Other: ArrowUpRight,
};

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const Icon = categoryIcons[transaction.category] ?? ArrowUpRight;
  const isExpense = transaction.type === "EXPENSE";
  const content = (
    <>
      <span className={`transaction-icon transaction-icon--${transaction.type.toLowerCase()}`}>
        <Icon aria-hidden="true" size={19} />
      </span>
      <span className="transaction-copy">
        <strong>{transaction.description}</strong>
        <small>{transaction.category} · {transaction.account}</small>
      </span>
      <span className={`transaction-amount transaction-amount--${transaction.type.toLowerCase()}`}>
        {isExpense ? "−" : "+"}{formatCurrency(transaction.amount)}
      </span>
    </>
  );

  return (
    <Link className="transaction-row" href={`/activity/${transaction.id}`}>
      {content}
    </Link>
  );
}
