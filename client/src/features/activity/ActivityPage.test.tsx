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
const { ActivityPage } = await import('./ActivityPage');
import type { Account, Category, Transaction } from '../../api/finance';

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

async function renderActivity() {
  await act(async () => {
    root!.render(
      <QueryClientProvider client={queryClient}>
        <ActivityPage />
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

describe('ActivityPage & Search Flow', () => {
  const mockAccounts: Account[] = [
    {
      id: 'acc_1',
      user_id: 'u1',
      name: 'Dompet Utama',
      type: 'CASH',
      opening_balance: 5000000,
      opening_balance_at: '2026-11-01',
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
    {
      id: 'acc_2',
      user_id: 'u1',
      name: 'Rekening BCA',
      type: 'BANK',
      opening_balance: 10000000,
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
    {
      id: 'tx_2',
      user_id: 'u1',
      account_id: 'acc_2',
      category_id: 'cat_salary',
      type: 'INCOME',
      amount: 5000000,
      description: 'Gaji bulanan',
      transaction_date: '2026-11-10',
      client_request_id: 'req_2',
      account_name: 'Rekening BCA',
      category_name: 'Gaji',
      created_at: '2026-11-10T09:00:00Z',
      updated_at: '2026-11-10T09:00:00Z',
    },
  ];

  test('renders empty state when there are no transactions', async () => {
    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/api/accounts')) return new Response(JSON.stringify(mockAccounts), { status: 200 });
      if (urlStr.endsWith('/api/categories')) return new Response(JSON.stringify(mockCategories), { status: 200 });
      if (urlStr.includes('/api/transactions')) return new Response(JSON.stringify([]), { status: 200 });
      return new Response('Not found', { status: 404 });
    }) as any;

    await renderActivity();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(container.textContent).toContain('Tidak ada transaksi ditemukan');
  });

  test('renders chronological transactions with category, description, date, and tabular amounts', async () => {
    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/api/accounts')) return new Response(JSON.stringify(mockAccounts), { status: 200 });
      if (urlStr.endsWith('/api/categories')) return new Response(JSON.stringify(mockCategories), { status: 200 });
      if (urlStr.includes('/api/transactions')) return new Response(JSON.stringify(mockTransactions), { status: 200 });
      return new Response('Not found', { status: 404 });
    }) as any;

    await renderActivity();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    const txList = container.querySelector('[data-testid="transactions-list"]');
    expect(txList).not.toBeNull();

    expect(txList?.textContent).toContain('Nasi padang siang');
    expect(txList?.textContent).toContain('Makanan');
    expect(txList?.textContent).toContain('-Rp 25.000');

    expect(txList?.textContent).toContain('Gaji bulanan');
    expect(txList?.textContent).toContain('Gaji');
    expect(txList?.textContent).toContain('+Rp 5.000.000');

    const amounts = txList?.querySelectorAll('.tabular-nums');
    expect(amounts?.length).toBe(2);
    expect(amounts?.[0]?.className).toContain('text-rose-400');
    expect(amounts?.[1]?.className).toContain('text-emerald-400');
  });

  test('filters transactions by type when clicking filter pills', async () => {
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      requestedUrls.push(urlStr);
      if (urlStr.endsWith('/api/accounts')) return new Response(JSON.stringify(mockAccounts), { status: 200 });
      if (urlStr.endsWith('/api/categories')) return new Response(JSON.stringify(mockCategories), { status: 200 });
      if (urlStr.includes('/api/transactions')) return new Response(JSON.stringify([]), { status: 200 });
      return new Response('Not found', { status: 404 });
    }) as any;

    await renderActivity();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    // Find filter buttons: "Semua", "Pengeluaran", "Pemasukan"
    const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[];
    const expenseBtn = buttons.find((b) => b.textContent?.trim() === 'Pengeluaran');
    const incomeBtn = buttons.find((b) => b.textContent?.trim() === 'Pemasukan');
    const allBtn = buttons.find((b) => b.textContent?.trim() === 'Semua');

    expect(expenseBtn).not.toBeUndefined();
    expect(incomeBtn).not.toBeUndefined();
    expect(allBtn).not.toBeUndefined();

    // Click "Pengeluaran"
    await act(async () => {
      expenseBtn!.click();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(requestedUrls.some((u) => u.includes('type=EXPENSE'))).toBe(true);

    // Click "Pemasukan"
    await act(async () => {
      incomeBtn!.click();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(requestedUrls.some((u) => u.includes('type=INCOME'))).toBe(true);
  });

  test('debounces search input and requests transactions with search query', async () => {
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      requestedUrls.push(urlStr);
      if (urlStr.endsWith('/api/accounts')) return new Response(JSON.stringify(mockAccounts), { status: 200 });
      if (urlStr.endsWith('/api/categories')) return new Response(JSON.stringify(mockCategories), { status: 200 });
      if (urlStr.includes('/api/transactions')) return new Response(JSON.stringify([]), { status: 200 });
      return new Response('Not found', { status: 404 });
    }) as any;

    await renderActivity();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    const searchInput = container.querySelector('input[placeholder="Cari transaksi..."]');
    expect(searchInput).not.toBeNull();

    await setInputValue(searchInput, 'Kopi');

    // Before debounce (e.g. 50ms), search should not have fired yet
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(requestedUrls.some((u) => u.includes('search=Kopi'))).toBe(false);

    // Wait for 300ms debounce
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    expect(requestedUrls.some((u) => u.includes('search=Kopi'))).toBe(true);

    // Test clear button
    const clearBtn = container.querySelector('button[aria-label="Hapus pencarian"]');
    expect(clearBtn).not.toBeNull();

    await act(async () => {
      clearBtn.click();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    expect((searchInput as HTMLInputElement).value).toBe('');
  });

  test('displays "Muat lebih banyak" button when next page exists and loads more items', async () => {
    const page1Txs: Transaction[] = Array.from({ length: 20 }, (_, i) => ({
      id: `tx_${i + 1}`,
      user_id: 'u1',
      account_id: 'acc_1',
      category_id: 'cat_food',
      type: 'EXPENSE',
      amount: 10000 * (i + 1),
      description: `Item ${i + 1}`,
      transaction_date: '2026-11-12',
      client_request_id: `req_${i + 1}`,
      category_name: 'Makanan',
      created_at: '2026-11-12T12:00:00Z',
      updated_at: '2026-11-12T12:00:00Z',
    }));

    const page2Txs: Transaction[] = [
      {
        id: 'tx_21',
        user_id: 'u1',
        account_id: 'acc_1',
        category_id: 'cat_food',
        type: 'EXPENSE',
        amount: 50000,
        description: 'Item 21 Extra',
        transaction_date: '2026-11-11',
        client_request_id: 'req_21',
        category_name: 'Makanan',
        created_at: '2026-11-11T12:00:00Z',
        updated_at: '2026-11-11T12:00:00Z',
      },
    ];

    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/api/accounts')) return new Response(JSON.stringify(mockAccounts), { status: 200 });
      if (urlStr.endsWith('/api/categories')) return new Response(JSON.stringify(mockCategories), { status: 200 });
      if (urlStr.includes('offset=20')) {
        return new Response(JSON.stringify(page2Txs), { status: 200 });
      }
      if (urlStr.includes('/api/transactions')) {
        return new Response(JSON.stringify(page1Txs), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    await renderActivity();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    const loadMoreBtn = Array.from(container.querySelectorAll('button')).find(
      (b: any) => b.textContent?.includes('Muat lebih banyak')
    ) as HTMLButtonElement;
    expect(loadMoreBtn).not.toBeUndefined();

    await act(async () => {
      loadMoreBtn.click();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(container.textContent).toContain('Item 21 Extra');

    // Page 2 had length 1 (< PAGE_SIZE 20), so button should be gone
    const loadMoreBtnAfter = Array.from(container.querySelectorAll('button')).find(
      (b: any) => b.textContent?.includes('Muat lebih banyak')
    );
    expect(loadMoreBtnAfter).toBeUndefined();
  });

  test('tapping transaction opens TransactionDetailSheet and allows updating', async () => {
    let patchUrl = '';
    let patchPayload: any = null;

    globalThis.fetch = (async (url: any, opts: any) => {
      const urlStr = String(url);
      if (opts?.method === 'PATCH') {
        patchUrl = urlStr;
        patchPayload = JSON.parse(opts.body);
        return new Response(
          JSON.stringify({ ...mockTransactions[0], ...patchPayload }),
          { status: 200 }
        );
      }
      if (urlStr.endsWith('/api/accounts')) return new Response(JSON.stringify(mockAccounts), { status: 200 });
      if (urlStr.endsWith('/api/categories')) return new Response(JSON.stringify(mockCategories), { status: 200 });
      if (urlStr.includes('/api/transactions')) return new Response(JSON.stringify(mockTransactions), { status: 200 });
      return new Response('Not found', { status: 404 });
    }) as any;

    await renderActivity();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    // Click the first transaction item
    const txRow = container.querySelector('[data-testid="transactions-list"] button') as HTMLButtonElement;
    expect(txRow).not.toBeNull();

    await act(async () => {
      txRow.click();
    });

    // Check bottom sheet is open
    const sheet = container.querySelector('[role="dialog"]');
    expect(sheet).not.toBeNull();
    expect(sheet?.textContent).toContain('Detail Transaksi');

    // Verify description field is populated
    const descInput = container.querySelector('#tx-detail-desc') as HTMLInputElement;
    expect(descInput).not.toBeNull();
    expect(descInput.value).toBe('Nasi padang siang');

    // Edit description
    await setInputValue(descInput, 'Nasi padang komplit');

    // Edit amount
    const amountInput = container.querySelector('#tx-detail-amount') as HTMLInputElement;
    expect(amountInput).not.toBeNull();
    await setInputValue(amountInput, '35000');

    // Submit form
    const form = sheet!.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }) as any);
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(patchUrl).toContain('/api/transactions/tx_1');
    expect(patchPayload).not.toBeNull();
    expect(patchPayload.description).toBe('Nasi padang komplit');
    expect(patchPayload.amount).toBe(35000);

    // Sheet should close
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  test('deleting transaction confirms and sends DELETE /api/transactions/:id', async () => {
    let deleteUrl = '';

    globalThis.fetch = (async (url: any, opts: any) => {
      const urlStr = String(url);
      if (opts?.method === 'DELETE') {
        deleteUrl = urlStr;
        return new Response(JSON.stringify({ message: 'transaction deleted' }), { status: 200 });
      }
      if (urlStr.endsWith('/api/accounts')) return new Response(JSON.stringify(mockAccounts), { status: 200 });
      if (urlStr.endsWith('/api/categories')) return new Response(JSON.stringify(mockCategories), { status: 200 });
      if (urlStr.includes('/api/transactions')) return new Response(JSON.stringify(mockTransactions), { status: 200 });
      return new Response('Not found', { status: 404 });
    }) as any;

    await renderActivity();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    // Click the first transaction item
    const txRow = container.querySelector('[data-testid="transactions-list"] button') as HTMLButtonElement;
    await act(async () => {
      txRow.click();
    });

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    // Click "Hapus" button to initiate confirmation
    const deleteBtn = Array.from(container.querySelectorAll('button')).find(
      (b: any) => b.textContent?.trim() === 'Hapus'
    ) as HTMLButtonElement;
    expect(deleteBtn).not.toBeUndefined();

    await act(async () => {
      deleteBtn.click();
    });

    // Confirmation prompt should appear
    expect(container.textContent).toContain('Hapus transaksi ini?');

    // Click confirm "Hapus" button
    const confirmDeleteBtn = Array.from(container.querySelectorAll('button')).find(
      (b: any) => b.textContent?.trim() === 'Hapus'
    ) as HTMLButtonElement;

    await act(async () => {
      confirmDeleteBtn.click();
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(deleteUrl).toContain('/api/transactions/tx_1');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  test('invalidates transactions and finance snapshot queries on update and delete', async () => {
    const invalidatedKeys: any[] = [];
    const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);
    queryClient.invalidateQueries = ((filters?: any) => {
      if (filters?.queryKey) {
        invalidatedKeys.push(filters.queryKey);
      }
      return originalInvalidate(filters);
    }) as any;

    globalThis.fetch = (async (url: any, opts: any) => {
      const urlStr = String(url);
      if (opts?.method === 'DELETE') {
        return new Response(JSON.stringify({ message: 'deleted' }), { status: 200 });
      }
      if (urlStr.endsWith('/api/accounts')) return new Response(JSON.stringify(mockAccounts), { status: 200 });
      if (urlStr.endsWith('/api/categories')) return new Response(JSON.stringify(mockCategories), { status: 200 });
      if (urlStr.includes('/api/transactions')) return new Response(JSON.stringify(mockTransactions), { status: 200 });
      return new Response('Not found', { status: 404 });
    }) as any;

    await renderActivity();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    const txRow = container.querySelector('[data-testid="transactions-list"] button') as HTMLButtonElement;
    await act(async () => {
      txRow.click();
    });

    const deleteBtn = Array.from(container.querySelectorAll('button')).find(
      (b: any) => b.textContent?.trim() === 'Hapus'
    ) as HTMLButtonElement;
    await act(async () => {
      deleteBtn.click();
    });

    const confirmDeleteBtn = Array.from(container.querySelectorAll('button')).find(
      (b: any) => b.textContent?.trim() === 'Hapus'
    ) as HTMLButtonElement;

    await act(async () => {
      confirmDeleteBtn.click();
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(invalidatedKeys.some((k) => JSON.stringify(k) === JSON.stringify(['transactions']))).toBe(true);
    expect(invalidatedKeys.some((k) => JSON.stringify(k) === JSON.stringify(['finance', 'snapshot']))).toBe(true);
  });
});
