import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow();
Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  HTMLFormElement: window.HTMLFormElement,
  Element: window.Element,
  Node: window.Node,
  Event: window.Event,
  KeyboardEvent: window.KeyboardEvent,
  CustomEvent: window.CustomEvent,
  localStorage: window.localStorage,
});

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const { describe, test, expect, beforeEach, afterEach } = await import('bun:test');
const { act } = await import('react');
import type { Root } from 'react-dom/client';
const { createRoot } = await import('react-dom/client');
const { QueryClientProvider } = await import('@tanstack/react-query');
const { queryClient } = await import('../../lib/queryClient');
const { HomeDashboard } = await import('./HomeDashboard');
import type { FinancialSnapshot, Account, Category, Transaction } from '../../api/finance';

let container: any;
let root: Root | null = null;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  queryClient.clear();
  container = window.document.createElement('div');
  window.document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (root) {
    act(() => {
      root!.unmount();
    });
    root = null;
  }
  if (container) {
    container.remove();
  }
  queryClient.clear();
});

async function renderHome() {
  await act(async () => {
    root!.render(
      <QueryClientProvider client={queryClient}>
        <HomeDashboard />
      </QueryClientProvider>
    );
  });
  return { container };
}

async function setInputValue(input: any, value: string) {
  await act(async () => {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeSetter?.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }) as any);
    input.dispatchEvent(new window.Event('change', { bubbles: true }) as any);
  });
}

describe('HomeDashboard Component', () => {
  const mockSnapshot: FinancialSnapshot = {
    total_balance: 5200000,
    monthly_income: 1000000,
    monthly_expense: 800000,
  };

  const mockAccounts: Account[] = [
    {
      id: 'acc_1',
      user_id: 'u1',
      name: 'Dompet Utama',
      type: 'CASH',
      opening_balance: 5200000,
      opening_balance_at: '2026-11-01',
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
  ];

  const mockCategories: Category[] = [
    {
      id: 'cat_food',
      user_id: 'u1',
      name: 'Makanan',
      type: 'EXPENSE',
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
    {
      id: 'cat_salary',
      user_id: 'u1',
      name: 'Gaji',
      type: 'INCOME',
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx_1',
      user_id: 'u1',
      account_id: 'acc_1',
      category_id: 'cat_food',
      type: 'EXPENSE',
      amount: 25000,
      description: 'Nasi padang siang',
      transaction_date: '2026-11-12',
      client_request_id: 'req_1',
      account_name: 'Dompet Utama',
      category_name: 'Makanan',
      created_at: '2026-11-12T12:00:00Z',
      updated_at: '2026-11-12T12:00:00Z',
    },
  ];

  const setupFetchMock = (customTxs: Transaction[] = mockTransactions) => {
    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/api/finance/snapshot')) {
        return new Response(JSON.stringify(mockSnapshot), { status: 200 });
      }
      if (urlStr.endsWith('/api/accounts')) {
        return new Response(JSON.stringify(mockAccounts), { status: 200 });
      }
      if (urlStr.endsWith('/api/categories')) {
        return new Response(JSON.stringify(mockCategories), { status: 200 });
      }
      if (urlStr.includes('/api/transactions?limit=')) {
        return new Response(JSON.stringify(customTxs), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    }) as any;
  };

  test('renders hero balance and monthly summary from query cache', async () => {
    setupFetchMock();

    await renderHome();

    // Allow queries to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    const heroEl = container.querySelector('[data-testid="hero-balance"]');
    expect(heroEl).not.toBeNull();
    expect(heroEl?.textContent).toBe('Rp 5.200.000');
    expect(heroEl?.className).toContain('tabular-nums');
    expect(heroEl?.className).toContain('text-3xl');

    const incomeEl = container.querySelector('[data-testid="monthly-income"]');
    expect(incomeEl?.textContent).toBe('Rp 1.000.000');
    expect(incomeEl?.className).toContain('text-emerald-400');

    const expenseEl = container.querySelector('[data-testid="monthly-expense"]');
    expect(expenseEl?.textContent).toBe('Rp 800.000');
    expect(expenseEl?.className).toContain('text-rose-400');
  });

  test('renders empty state when there are no recent transactions', async () => {
    setupFetchMock([]);

    await renderHome();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(container.textContent).toContain('Belum ada transaksi');
  });

  test('renders recent transactions with category, description, and tabular amount', async () => {
    setupFetchMock();

    await renderHome();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    const txList = container.querySelector('[data-testid="recent-transactions-list"]');
    expect(txList).not.toBeNull();
    expect(txList?.textContent).toContain('Nasi padang siang');
    expect(txList?.textContent).toContain('Makanan');
    expect(txList?.textContent).toContain('-Rp 25.000');
  });

  test('clicking "Tambah manual" opens bottom sheet with empty form and title "Tambah Transaksi"', async () => {
    setupFetchMock();

    await renderHome();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    // Bottom sheet is closed initially
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    // Find and click "Tambah manual" button
    const manualBtn = Array.from(container.querySelectorAll('button')).find(
      (btn: any) => btn.textContent?.includes('Tambah manual')
    ) as HTMLButtonElement;
    expect(manualBtn).not.toBeNull();

    await act(async () => {
      manualBtn.click();
    });

    const sheet = container.querySelector('[role="dialog"]');
    expect(sheet).not.toBeNull();
    expect(sheet?.textContent).toContain('Tambah Transaksi');
    expect(sheet?.textContent).toContain('Pengeluaran');
    expect(sheet?.textContent).toContain('Pemasukan');
    expect(sheet?.textContent).toContain('Makanan');
    expect(sheet?.textContent).toContain('Dompet Utama');
  });

  test('manual transaction save performs optimistic update on snapshot and transactions', async () => {
    let transactionCreated = false;
    let createPayload: any = null;

    globalThis.fetch = (async (url: any, opts: any) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/api/finance/snapshot')) {
        return new Response(JSON.stringify(mockSnapshot), { status: 200 });
      }
      if (urlStr.endsWith('/api/accounts')) {
        return new Response(JSON.stringify(mockAccounts), { status: 200 });
      }
      if (urlStr.endsWith('/api/categories')) {
        return new Response(JSON.stringify(mockCategories), { status: 200 });
      }
      if (urlStr.includes('/api/transactions?limit=')) {
        return new Response(JSON.stringify(mockTransactions), { status: 200 });
      }
      if (urlStr.endsWith('/api/transactions') && opts?.method === 'POST') {
        transactionCreated = true;
        createPayload = JSON.parse(opts.body);
        const createdTx: Transaction = {
          id: 'tx_new_1',
          user_id: 'u1',
          account_id: createPayload.account_id,
          category_id: createPayload.category_id,
          type: createPayload.type,
          amount: createPayload.amount,
          description: createPayload.description,
          transaction_date: createPayload.transaction_date,
          client_request_id: createPayload.client_request_id,
          account_name: 'Dompet Utama',
          category_name: 'Makanan',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return new Response(JSON.stringify(createdTx), { status: 201 });
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    await renderHome();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    // Open sheet
    const manualBtn = Array.from(container.querySelectorAll('button')).find(
      (btn: any) => btn.textContent?.includes('Tambah manual')
    ) as HTMLButtonElement;
    await act(async () => {
      manualBtn.click();
    });

    const sheet = container.querySelector('[role="dialog"]') as HTMLElement;
    const amountInput = sheet.querySelector('#tx-amount') as HTMLInputElement;
    const descInput = sheet.querySelector('#tx-desc') as HTMLInputElement;

    // Enter amount 50000 and description "Kopi Sore"
    await setInputValue(amountInput, '50000');
    await setInputValue(descInput, 'Kopi Sore');

    const form = sheet.querySelector('form') as HTMLFormElement;

    // Submit form
    await act(async () => {
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }) as any);
      // Wait for mutation to settle
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(transactionCreated).toBe(true);
    expect(createPayload.amount).toBe(50000);
    expect(createPayload.description).toBe('Kopi Sore');
    expect(createPayload.type).toBe('EXPENSE');
  });

  test('AI Composer draft flow opens sheet prefilled with draft and title "Konfirmasi Transaksi"', async () => {
    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/api/finance/snapshot')) {
        return new Response(JSON.stringify(mockSnapshot), { status: 200 });
      }
      if (urlStr.endsWith('/api/accounts')) {
        return new Response(JSON.stringify(mockAccounts), { status: 200 });
      }
      if (urlStr.endsWith('/api/categories')) {
        return new Response(JSON.stringify(mockCategories), { status: 200 });
      }
      if (urlStr.includes('/api/transactions?limit=')) {
        return new Response(JSON.stringify(mockTransactions), { status: 200 });
      }
      if (urlStr.endsWith('/api/ai/parse-transaction')) {
        return new Response(
          JSON.stringify({
            draft: {
              amount: 150000,
              type: 'INCOME',
              category_id: 'cat_salary',
              account_id: 'acc_1',
              description: 'Bonus lembur',
              transaction_date: '2026-11-12',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    await renderHome();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    const aiInput = container.querySelector('input[placeholder*="Makan siang"]') as HTMLInputElement;
    expect(aiInput).not.toBeNull();

    await setInputValue(aiInput, 'Bonus lembur 150rb');

    const aiForm = aiInput.closest('form') as HTMLFormElement;

    await act(async () => {
      aiForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }) as any);
      await new Promise((r) => setTimeout(r, 20));
    });

    // Sheet should now be open with title "Konfirmasi Transaksi" and prefilled values
    const sheet = container.querySelector('[role="dialog"]');
    expect(sheet).not.toBeNull();
    expect(sheet?.textContent).toContain('Konfirmasi Transaksi');

    const amountInput = sheet?.querySelector('#tx-amount') as HTMLInputElement;
    expect(amountInput.value).toBe('150.000');

    const descInput = sheet?.querySelector('#tx-desc') as HTMLInputElement;
    expect(descInput.value).toBe('Bonus lembur');
  });
});
