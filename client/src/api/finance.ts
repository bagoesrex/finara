import { apiFetch } from './client';

export type TransactionType = 'EXPENSE' | 'INCOME';
export type AccountType = 'CASH' | 'BANK' | 'E_WALLET';

export interface FinancialSnapshot {
  total_balance: number;
  monthly_income: number;
  monthly_expense: number;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  opening_balance_at: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string;
  transaction_time?: string;
  client_request_id: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  account_name?: string;
  category_name?: string;
}

export interface CreateTransactionInput {
  account_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string;
  transaction_time?: string;
  client_request_id?: string;
}

export interface ParsedTransactionDraft {
  amount: number;
  type: TransactionType;
  category_id: string;
  account_id: string;
  description: string;
  transaction_date: string;
}

export interface ParseTransactionResponse {
  draft: ParsedTransactionDraft;
}

export function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount || 0));
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${isNegative ? '-Rp ' : 'Rp '}${formatted}`;
}

export const financeApi = {
  getSnapshot: (): Promise<FinancialSnapshot> =>
    apiFetch<FinancialSnapshot>('/api/finance/snapshot'),

  getAccounts: (): Promise<Account[]> =>
    apiFetch<Account[]>('/api/accounts'),

  getCategories: (): Promise<Category[]> =>
    apiFetch<Category[]>('/api/categories'),

  getRecentTransactions: (limit = 5): Promise<Transaction[]> =>
    apiFetch<Transaction[]>(`/api/transactions?limit=${limit}`),

  createTransaction: (data: CreateTransactionInput): Promise<Transaction> => {
    const client_request_id =
      data.client_request_id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

    return apiFetch<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({ ...data, client_request_id }),
    });
  },

  parseTransactionAI: (prompt: string): Promise<ParseTransactionResponse> =>
    apiFetch<ParseTransactionResponse>('/api/ai/parse-transaction', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
};
