import type { BudgetAllocation, SearchableTransaction } from "./finance";

export type Transaction = SearchableTransaction & {
  note?: string;
};

export type Budget = BudgetAllocation;

export const financialSummary = {
  available: 4_250_000,
  spentThisMonth: 1_420_000,
  incomeThisMonth: 5_670_000,
  monthKey: "2026-08",
  monthLabel: "Agustus 2026",
} as const;

export const mockToday = "2026-08-25";
export const accounts = ["BCA", "GoPay", "Cash"] as const;

export const transactions: Transaction[] = [
  {
    id: "trx-coffee",
    description: "Kopi susu",
    category: "Food & Drink",
    account: "GoPay",
    amount: 18_000,
    type: "EXPENSE",
    date: "2026-08-25",
    time: "08:20",
  },
  {
    id: "trx-lunch",
    description: "Makan siang",
    category: "Food & Drink",
    account: "Cash",
    amount: 25_000,
    type: "EXPENSE",
    date: "2026-08-25",
    time: "12:34",
    note: "Ayam bakar dekat kantor",
  },
  {
    id: "trx-grab",
    description: "Grab ke kantor",
    category: "Transport",
    account: "GoPay",
    amount: 22_000,
    type: "EXPENSE",
    date: "2026-08-24",
    time: "07:45",
  },
  {
    id: "trx-internet",
    description: "Internet rumah",
    category: "Bills",
    account: "BCA",
    amount: 350_000,
    type: "EXPENSE",
    date: "2026-08-23",
    time: "19:10",
  },
  {
    id: "trx-groceries",
    description: "Belanja mingguan",
    category: "Shopping",
    account: "BCA",
    amount: 284_000,
    type: "EXPENSE",
    date: "2026-08-22",
    time: "17:42",
  },
  {
    id: "trx-salary",
    description: "Gaji Agustus",
    category: "Salary",
    account: "BCA",
    amount: 5_000_000,
    type: "INCOME",
    date: "2026-08-21",
    time: "09:00",
  },
  {
    id: "trx-freelance",
    description: "Project freelance",
    category: "Freelance",
    account: "BCA",
    amount: 670_000,
    type: "INCOME",
    date: "2026-08-19",
    time: "15:25",
  },
];

export const budgets: Budget[] = [
  {
    id: "budget-food",
    category: "Food & Drink",
    amount: 800_000,
    monthKey: "2026-08",
  },
  {
    id: "budget-transport",
    category: "Transport",
    amount: 400_000,
    monthKey: "2026-08",
  },
  {
    id: "budget-entertainment",
    category: "Entertainment",
    amount: 300_000,
    monthKey: "2026-08",
  },
  {
    id: "budget-shopping",
    category: "Shopping",
    amount: 600_000,
    monthKey: "2026-08",
  },
];

export const userProfile = {
  name: "Bagus Aditya",
  email: "bagus@finara.id",
  initials: "BA",
} as const;
