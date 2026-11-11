import type { Page, Route } from '@playwright/test';

export interface MockState {
  user: { id: string; name: string; email: string } | null;
  token: string | null;
  snapshot: { total_balance: number; monthly_income: number; monthly_expense: number };
  accounts: Array<{
    id: string;
    user_id: string;
    name: string;
    type: 'CASH' | 'BANK' | 'E_WALLET';
    opening_balance: number;
    opening_balance_at: string;
    created_at: string;
    updated_at: string;
  }>;
  categories: Array<{
    id: string;
    user_id: string;
    name: string;
    type: 'EXPENSE' | 'INCOME';
    created_at: string;
    updated_at: string;
  }>;
  transactions: Array<{
    id: string;
    user_id: string;
    account_id: string;
    category_id: string;
    type: 'EXPENSE' | 'INCOME';
    amount: number;
    description: string;
    transaction_date: string;
    transaction_time?: string;
    client_request_id: string;
    account_name?: string;
    category_name?: string;
    created_at: string;
    updated_at: string;
  }>;
  budgets: Array<{
    id: string;
    user_id: string;
    category_id: string;
    category_type: 'EXPENSE' | 'INCOME';
    period_start: string;
    amount: number;
    created_at: string;
    updated_at: string;
    category_name: string;
    spent: number;
    remaining: number;
  }>;
}

export function createDefaultMockState(): MockState {
  return {
    user: null,
    token: null,
    snapshot: { total_balance: 0, monthly_income: 0, monthly_expense: 0 },
    accounts: [
      {
        id: 'acc_cash',
        user_id: 'user_1',
        name: 'Tunai',
        type: 'CASH',
        opening_balance: 0,
        opening_balance_at: '2026-01-01',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ],
    categories: [
      {
        id: 'cat_food',
        user_id: 'user_1',
        name: 'Makanan',
        type: 'EXPENSE',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'cat_transport',
        user_id: 'user_1',
        name: 'Transport',
        type: 'EXPENSE',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'cat_salary',
        user_id: 'user_1',
        name: 'Gaji',
        type: 'INCOME',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ],
    transactions: [],
    budgets: [],
  };
}

export async function setupMockApi(page: Page, customState?: Partial<MockState>): Promise<MockState> {
  const state: MockState = {
    ...createDefaultMockState(),
    ...customState,
  };

  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    const json = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });

    // 1. Auth routes
    if (path === '/api/auth/register' && method === 'POST') {
      const body = request.postDataJSON() || {};
      state.user = {
        id: 'user_1',
        name: body.name || 'Test User',
        email: body.email || 'user@example.com',
      };
      state.token = 'mock_jwt_token_123';
      return json({ token: state.token, user: state.user }, 201);
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const body = request.postDataJSON() || {};
      state.user = {
        id: 'user_1',
        name: 'Test User',
        email: body.email || 'user@example.com',
      };
      state.token = 'mock_jwt_token_123';
      return json({ token: state.token, user: state.user }, 200);
    }

    if (path === '/api/auth/me' && method === 'GET') {
      if (state.token && state.user) {
        return json({ user: state.user }, 200);
      }
      return json({ error: 'unauthorized' }, 401);
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      state.token = null;
      state.user = null;
      return json({ message: 'logged out' }, 200);
    }

    // 2. Finance snapshot
    if (path === '/api/finance/snapshot' && method === 'GET') {
      return json(state.snapshot, 200);
    }

    // 3. Accounts
    if (path === '/api/accounts' && method === 'GET') {
      return json(state.accounts, 200);
    }

    // 4. Categories
    if (path === '/api/categories' && method === 'GET') {
      return json(state.categories, 200);
    }

    // 5. AI Composer parse
    if (path === '/api/ai/parse-transaction' && method === 'POST') {
      const body = request.postDataJSON() || {};
      const prompt: string = (body.prompt || '').toLowerCase();

      // default draft
      let amount = 25000;
      let description = 'Makan padang';
      let categoryId = 'cat_food';

      if (prompt.includes('padang') || prompt.includes('makan')) {
        amount = 25000;
        description = 'Makan padang';
        categoryId = 'cat_food';
      } else if (prompt.includes('bensin')) {
        amount = 50000;
        description = 'Beli bensin';
        categoryId = 'cat_transport';
      }

      return json({
        draft: {
          amount,
          type: 'EXPENSE',
          category_id: categoryId,
          account_id: state.accounts[0]?.id || 'acc_cash',
          description,
          transaction_date: new Date().toISOString().split('T')[0],
        },
      });
    }

    // 6. Transactions
    if (path === '/api/transactions' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const search = (url.searchParams.get('search') || '').toLowerCase();
      const type = url.searchParams.get('type');

      let filtered = [...state.transactions];
      if (search) {
        filtered = filtered.filter(
          (t) =>
            t.description.toLowerCase().includes(search) ||
            t.category_name?.toLowerCase().includes(search)
        );
      }
      if (type) {
        filtered = filtered.filter((t) => t.type === type);
      }
      return json(filtered.slice(0, limit), 200);
    }

    if (path === '/api/transactions' && method === 'POST') {
      const body = request.postDataJSON() || {};
      const cat = state.categories.find((c) => c.id === body.category_id);
      const acc = state.accounts.find((a) => a.id === body.account_id);

      const newTx = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: state.user?.id || 'user_1',
        account_id: body.account_id,
        category_id: body.category_id,
        type: body.type || 'EXPENSE',
        amount: body.amount || 0,
        description: body.description || '',
        transaction_date: body.transaction_date || new Date().toISOString().split('T')[0],
        transaction_time: body.transaction_time,
        client_request_id: body.client_request_id || `req_${Date.now()}`,
        account_name: acc?.name || 'Tunai',
        category_name: cat?.name || 'Umum',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      state.transactions.unshift(newTx);

      if (newTx.type === 'EXPENSE') {
        state.snapshot.total_balance -= newTx.amount;
        state.snapshot.monthly_expense += newTx.amount;
      } else {
        state.snapshot.total_balance += newTx.amount;
        state.snapshot.monthly_income += newTx.amount;
      }

      return json(newTx, 201);
    }

    // 7. Budgets
    if (path === '/api/budgets' && method === 'GET') {
      // Return budgets with dynamic spent and remaining based on current transactions
      const enriched = state.budgets.map((b) => {
        const spent = state.transactions
          .filter((t) => t.category_id === b.category_id && t.type === 'EXPENSE')
          .reduce((sum, t) => sum + t.amount, 0);
        return {
          ...b,
          spent,
          remaining: b.amount - spent,
        };
      });
      return json(enriched, 200);
    }

    if (path === '/api/budgets' && method === 'POST') {
      const body = request.postDataJSON() || {};
      const cat = state.categories.find((c) => c.id === body.category_id);
      let existing = state.budgets.find((b) => b.category_id === body.category_id);

      if (existing) {
        existing.amount = body.amount;
        existing.updated_at = new Date().toISOString();
      } else {
        existing = {
          id: `b_${Date.now()}`,
          user_id: state.user?.id || 'user_1',
          category_id: body.category_id,
          category_type: 'EXPENSE',
          period_start: `${body.month || '2026-11'}-01`,
          amount: body.amount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category_name: cat?.name || 'Makanan',
          spent: 0,
          remaining: body.amount,
        };
        state.budgets.push(existing);
      }

      const spent = state.transactions
        .filter((t) => t.category_id === existing.category_id && t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

      const result = {
        ...existing,
        spent,
        remaining: existing.amount - spent,
      };

      return json(result, 200);
    }

    // Default fallback
    return route.continue();
  });

  return state;
}
