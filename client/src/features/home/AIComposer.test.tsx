import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow();
Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
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
const { AIComposer } = await import('./AIComposer');
import type { ParsedTransactionDraft } from '../../api/finance';

let container: any;
let root: Root | null = null;
const originalFetch = globalThis.fetch;

beforeEach(() => {
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
});

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

describe('AIComposer Component', () => {
  test('renders with 16px text input and >=44px touch target button', async () => {
    await act(async () => {
      root!.render(<AIComposer onDraftReady={() => {}} />);
    });

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.className).toContain('text-base');
    expect(input.placeholder).toContain('Makan siang 25rb');

    const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.className).toContain('min-h-[44px]');
    expect(button.className).toContain('min-w-[44px]');
    expect(button.disabled).toBe(true);
  });

  test('submitting prompt calls API, displays loading indicator, and invokes onDraftReady on success', async () => {
    let capturedDraft: ParsedTransactionDraft | null = null;
    let requestPayload: any = null;

    const mockDraft: ParsedTransactionDraft = {
      amount: 35000,
      type: 'EXPENSE',
      category_id: 'cat_food',
      account_id: 'acc_cash',
      description: 'Makan siang padang',
      transaction_date: '2026-11-12',
    };

    globalThis.fetch = (async (url: any, opts: any) => {
      if (String(url).endsWith('/api/ai/parse-transaction')) {
        requestPayload = JSON.parse(opts.body);
        return new Response(JSON.stringify({ draft: mockDraft }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    await act(async () => {
      root!.render(
        <AIComposer
          onDraftReady={(draft) => {
            capturedDraft = draft;
          }}
        />
      );
    });

    const input = container.querySelector('input') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    await setInputValue(input, 'Makan siang 35rb');

    const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(false);

    await act(async () => {
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }) as any);
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(requestPayload).toEqual({ prompt: 'Makan siang 35rb' });
    expect(capturedDraft as any).toEqual(mockDraft);
    // On success: clears input prompt
    expect(input.value).toBe('');
    expect(container.querySelector('[data-testid="ai-loading-bar"]')).toBeNull();
  });

  test('on error: displays concise error and keeps prompt intact', async () => {
    globalThis.fetch = (async (url: any) => {
      if (String(url).endsWith('/api/ai/parse-transaction')) {
        return new Response(JSON.stringify({ error: 'AI rate limit exceeded' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    let callbackCalled = false;

    await act(async () => {
      root!.render(
        <AIComposer
          onDraftReady={() => {
            callbackCalled = true;
          }}
        />
      );
    });

    const input = container.querySelector('input') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    await setInputValue(input, 'Beli bensin 50rb');

    await act(async () => {
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }) as any);
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(callbackCalled).toBe(false);
    expect(container.textContent).toContain('Gagal memproses draf, silakan coba lagi');
    // Keeps prompt intact so user does not lose input
    expect(input.value).toBe('Beli bensin 50rb');
    expect(container.querySelector('[data-testid="ai-loading-bar"]')).toBeNull();

    // Typing again clears the error
    await setInputValue(input, 'Beli bensin 50rb lagi');

    expect(container.textContent).not.toContain('Gagal memproses draf, silakan coba lagi');
  });
});
