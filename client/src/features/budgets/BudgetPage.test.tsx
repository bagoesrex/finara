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
const {
  BudgetPage,
  getGaugeColor,
  shiftMonth,
  formatMonthDisplay,
} = await import('./BudgetPage');
import type { BudgetWithProgress, Category } from '../../api/finance';

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

async function renderBudgetPage(initialMonth?: string) {
  await act(async () => {
    root!.render(
      <QueryClientProvider client={queryClient}>
        <BudgetPage initialMonth={initialMonth} />
      </QueryClientProvider>
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
  return { container };
}

describe('BudgetPage & Allocation Flow', () => {
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
      id: 'cat_transport',
      user_id: 'u1',
      name: 'Transportasi',
      type: 'EXPENSE',
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
    {
      id: 'cat_entertainment',
      user_id: 'u1',
      name: 'Hiburan',
      type: 'EXPENSE',
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
    {
      id: 'cat_salary',
      user_id: 'u1',
      name: 'Gaji Pokok',
      type: 'INCOME',
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
  ];

  const mockBudgets: BudgetWithProgress[] = [
    {
      id: 'b_1',
      user_id: 'u1',
      category_id: 'cat_food',
      category_type: 'EXPENSE',
      period_start: '2026-11-01',
      amount: 1000000,
      spent: 500000,
      remaining: 500000,
      category_name: 'Makanan',
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
    {
      id: 'b_2',
      user_id: 'u1',
      category_id: 'cat_transport',
      category_type: 'EXPENSE',
      period_start: '2026-11-01',
      amount: 1000000,
      spent: 800000,
      remaining: 200000,
      category_name: 'Transportasi',
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
    {
      id: 'b_3',
      user_id: 'u1',
      category_id: 'cat_entertainment',
      category_type: 'EXPENSE',
      period_start: '2026-11-01',
      amount: 1000000,
      spent: 1200000,
      remaining: -200000,
      category_name: 'Hiburan',
      created_at: '2026-11-01',
      updated_at: '2026-11-01',
    },
  ];

  test('linear progress gauge helper colors match spec thresholds', () => {
    // 0-75% emerald
    expect(getGaugeColor(0)).toBe('bg-emerald-500');
    expect(getGaugeColor(50)).toBe('bg-emerald-500');
    expect(getGaugeColor(75)).toBe('bg-emerald-500');

    // 76-90% amber
    expect(getGaugeColor(76)).toBe('bg-amber-500');
    expect(getGaugeColor(85)).toBe('bg-amber-500');
    expect(getGaugeColor(90)).toBe('bg-amber-500');

    // >90% rose
    expect(getGaugeColor(91)).toBe('bg-rose-500');
    expect(getGaugeColor(100)).toBe('bg-rose-500');
    expect(getGaugeColor(125)).toBe('bg-rose-500');
  });

  test('month navigation helpers calculate correct delta and display', () => {
    expect(shiftMonth('2026-11', -1)).toBe('2026-10');
    expect(shiftMonth('2026-11', 1)).toBe('2026-12');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');

    const formatted = formatMonthDisplay('2026-11');
    expect(formatted.toLowerCase()).toContain('november');
    expect(formatted).toContain('2026');
  });

  test('renders empty state when month has no allocated budgets', async () => {
    globalThis.fetch = (async (url: string) => {
      if (url.includes('/api/budgets')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/categories')) {
        return new Response(JSON.stringify(mockCategories), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('{}', { status: 200 });
    }) as any;

    await renderBudgetPage('2026-11');

    expect(container.textContent).toContain('Belum ada budget untuk bulan ini');
    expect(container.textContent).toContain('Alokasi Budget');
  });

  test('navigates to next and previous months via switcher buttons', async () => {
    const fetchedUrls: string[] = [];

    globalThis.fetch = (async (url: string) => {
      fetchedUrls.push(url);
      if (url.includes('/api/budgets')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('[]', { status: 200 });
    }) as any;

    await renderBudgetPage('2026-11');

    const monthDisplay = container.querySelector('[data-testid="current-month-display"]');
    expect(monthDisplay?.textContent?.toLowerCase()).toContain('november');

    // Click next month
    const nextBtn = container.querySelector('button[aria-label="Bulan berikutnya"]');
    expect(nextBtn).toBeTruthy();

    await act(async () => {
      nextBtn?.dispatchEvent(new window.Event('click', { bubbles: true }) as any);
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(monthDisplay?.textContent?.toLowerCase()).toContain('desember');
    expect(fetchedUrls.some((u) => u.includes('month=2026-12'))).toBe(true);

    // Click previous month twice to go back to October
    const prevBtn = container.querySelector('button[aria-label="Bulan sebelumnya"]');
    await act(async () => {
      prevBtn?.dispatchEvent(new window.Event('click', { bubbles: true }) as any);
      await new Promise((r) => setTimeout(r, 30));
    });
    await act(async () => {
      prevBtn?.dispatchEvent(new window.Event('click', { bubbles: true }) as any);
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(monthDisplay?.textContent?.toLowerCase()).toContain('oktober');
    expect(fetchedUrls.some((u) => u.includes('month=2026-10'))).toBe(true);
  });

  test('renders category budget cards with correct gauges, status and tabular figures', async () => {
    globalThis.fetch = (async (url: string) => {
      if (url.includes('/api/budgets')) {
        return new Response(JSON.stringify(mockBudgets), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/categories')) {
        return new Response(JSON.stringify(mockCategories), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('[]', { status: 200 });
    }) as any;

    await renderBudgetPage('2026-11');

    // Overview card checks
    // Total spent = 500k + 800k + 1.2M = 2.5M
    // Total amount = 1M + 1M + 1M = 3M
    // Total percentage = 83% -> amber gauge
    expect(container.textContent).toContain('Total Terpakai vs Total Budget');
    expect(container.textContent).toContain('83%');
    expect(container.textContent).toContain('Rp 2.500.000');
    expect(container.textContent).toContain('Rp 3.000.000');
    expect(container.textContent).toContain('Sisa Rp 500.000');

    // Category cards
    const foodCard = container.querySelector('[data-testid="budget-item-cat_food"]');
    expect(foodCard).toBeTruthy();
    expect(foodCard?.textContent).toContain('Makanan');
    expect(foodCard?.textContent).toContain('50%');
    expect(foodCard?.textContent).toContain('Sisa Rp 500.000');
    const foodGauge = foodCard?.querySelector('[role="progressbar"]');
    expect(foodGauge?.className).toContain('bg-emerald-500');

    const transportCard = container.querySelector('[data-testid="budget-item-cat_transport"]');
    expect(transportCard).toBeTruthy();
    expect(transportCard?.textContent).toContain('Transportasi');
    expect(transportCard?.textContent).toContain('80%');
    expect(transportCard?.textContent).toContain('Sisa Rp 200.000');
    const transportGauge = transportCard?.querySelector('[role="progressbar"]');
    expect(transportGauge?.className).toContain('bg-amber-500');

    const entertainmentCard = container.querySelector(
      '[data-testid="budget-item-cat_entertainment"]'
    );
    expect(entertainmentCard).toBeTruthy();
    expect(entertainmentCard?.textContent).toContain('Hiburan');
    expect(entertainmentCard?.textContent).toContain('120%');
    expect(entertainmentCard?.textContent).toContain('Overbudget Rp 200.000');
    const entertainmentGauge = entertainmentCard?.querySelector('[role="progressbar"]');
    expect(entertainmentGauge?.className).toContain('bg-rose-500');
  });

  test('opens allocation sheet from top CTA, fills form and submits upsertBudget', async () => {
    let capturedBody: any = null;

    globalThis.fetch = (async (url: string, options?: any) => {
      if (url.includes('/api/budgets') && options?.method === 'POST') {
        capturedBody = JSON.parse(options.body);
        return new Response(JSON.stringify({ ...mockBudgets[0], ...capturedBody }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/budgets')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/categories')) {
        return new Response(JSON.stringify(mockCategories), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('[]', { status: 200 });
    }) as any;

    await renderBudgetPage('2026-11');

    // Find and click top "Alokasi Budget" button
    const topCta = Array.from(container.querySelectorAll('button')).find((b: any) =>
      b.textContent?.includes('Alokasi Budget')
    ) as any;
    expect(topCta).toBeTruthy();

    await act(async () => {
      topCta.dispatchEvent(new window.Event('click', { bubbles: true }) as any);
      await new Promise((r) => setTimeout(r, 30));
    });

    // Modal sheet should now be open
    const sheetTitle = container.querySelector('#bottom-sheet-title');
    expect(sheetTitle?.textContent).toBe('Alokasi Budget');

    // Only expense categories should be rendered as selectable pills
    expect(container.textContent).toContain('Makanan');
    expect(container.textContent).toContain('Transportasi');
    expect(container.textContent).toContain('Hiburan');
    // Income category 'Gaji Pokok' must NOT be present
    expect(container.textContent).not.toContain('Gaji Pokok');

    // Select 'Transportasi' category pill
    const transportPill = Array.from(container.querySelectorAll('button')).find((b: any) =>
      b.textContent === 'Transportasi'
    ) as any;
    expect(transportPill).toBeTruthy();

    await act(async () => {
      transportPill.dispatchEvent(new window.Event('click', { bubbles: true }) as any);
    });

    // Enter amount in numeric input
    const input = container.querySelector('#budget-amount-input') as any;
    expect(input).toBeTruthy();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(input, '1500000');
      input.dispatchEvent(new window.Event('input', { bubbles: true }) as any);
      input.dispatchEvent(new window.Event('change', { bubbles: true }) as any);
    });

    // Find form and submit
    const form = container.querySelector('form') as any;
    expect(form).toBeTruthy();

    await act(async () => {
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }) as any);
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(capturedBody).toEqual({
      category_id: 'cat_transport',
      month: '2026-11',
      amount: 1500000,
    });
  });

  test('clicking a category card opens allocation sheet prefilled with that category', async () => {
    globalThis.fetch = (async (url: string) => {
      if (url.includes('/api/budgets')) {
        return new Response(JSON.stringify(mockBudgets), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/categories')) {
        return new Response(JSON.stringify(mockCategories), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('[]', { status: 200 });
    }) as any;

    await renderBudgetPage('2026-11');

    // Click transport budget card
    const transportCard = container.querySelector('[data-testid="budget-item-cat_transport"]');
    expect(transportCard).toBeTruthy();

    await act(async () => {
      transportCard?.dispatchEvent(new window.Event('click', { bubbles: true }) as any);
      await new Promise((r) => setTimeout(r, 30));
    });

    // Check prefilled amount in input: 1.000.000
    const input = container.querySelector('#budget-amount-input') as any;
    expect(input).toBeTruthy();
    expect(input.value).toBe('1.000.000');

    // Check transport pill is active
    const transportPill = Array.from(container.querySelectorAll('button')).find((b: any) =>
      b.textContent === 'Transportasi'
    ) as any;
    expect(transportPill?.className).toContain('text-emerald-400');
  });

  test('anti-slop: zero emojis across rendered UI and linear progress gauges used', async () => {
    globalThis.fetch = (async (url: string) => {
      if (url.includes('/api/budgets')) {
        return new Response(JSON.stringify(mockBudgets), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/categories')) {
        return new Response(JSON.stringify(mockCategories), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('[]', { status: 200 });
    }) as any;

    await renderBudgetPage('2026-11');

    const html = container.innerHTML;
    // Regex checking common emojis
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(html)).toBe(false);

    // Linear progress gauges exist with role="progressbar"
    const progressbars = container.querySelectorAll('[role="progressbar"]');
    expect(progressbars.length).toBe(4); // 1 overview + 3 categories
  });
});
