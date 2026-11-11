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

export interface UpdateTransactionInput {
  account_id?: string;
  category_id?: string;
  type?: TransactionType;
  amount?: number;
  description?: string;
  transaction_date?: string;
  transaction_time?: string;
}

export interface TransactionFilters {
  search?: string;
  type?: TransactionType;
  limit?: number;
  offset?: number;
  cursor?: string;
  account_id?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
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

export interface BudgetWithProgress {
  id: string;
  user_id: string;
  category_id: string;
  category_type: TransactionType;
  period_start: string;
  amount: number;
  created_at: string;
  updated_at: string;
  category_name: string;
  spent: number;
  remaining: number;
}

export interface UpsertBudgetInput {
  category_id: string;
  month: string;
  amount: number;
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

  getTransactions: (filters?: TransactionFilters): Promise<Transaction[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());
    if (filters?.cursor) params.append('cursor', filters.cursor);
    if (filters?.account_id) params.append('account_id', filters.account_id);
    if (filters?.category_id) params.append('category_id', filters.category_id);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const query = params.toString();
    return apiFetch<Transaction[]>(`/api/transactions${query ? `?${query}` : ''}`);
  },

  updateTransaction: (id: string, data: UpdateTransactionInput): Promise<Transaction> =>
    apiFetch<Transaction>(`/api/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    }),

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

  getBudgets: (month?: string): Promise<BudgetWithProgress[]> => {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    return apiFetch<BudgetWithProgress[]>(`/api/budgets${query}`);
  },

  upsertBudget: (data: UpsertBudgetInput): Promise<BudgetWithProgress> =>
    apiFetch<BudgetWithProgress>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
