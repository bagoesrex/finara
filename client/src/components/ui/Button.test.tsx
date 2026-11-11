import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow();
Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  Event: window.Event,
  CustomEvent: window.CustomEvent,
});

const { describe, test, expect, afterEach } = await import('bun:test');
import type { ReactElement } from 'react';
const { createRoot } = await import('react-dom/client');
const { flushSync } = await import('react-dom');
const { Button } = await import('./Button');

const mountedRoots: Array<{ unmount: () => void }> = [];

afterEach(() => {
  while (mountedRoots.length > 0) {
    const r = mountedRoots.pop();
    r?.unmount();
  }
});

function render(ui: ReactElement) {
  const container = window.document.createElement('div');
  window.document.body.appendChild(container);
  const root = createRoot(container as any);
  flushSync(() => {
    root.render(ui);
  });
  const unmount = () => {
    flushSync(() => {
      root.unmount();
    });
    container.remove();
  };
  mountedRoots.push({ unmount });
  return {
    container,
    unmount,
  };
}

describe('Button Component', () => {
  test('renders primary variant by default with >=44px touch target', () => {
    const { container } = render(<Button>Simpan</Button>);
    const btn = container.querySelector('button') as any;
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toBe('Simpan');
    expect(btn?.className).toContain('bg-emerald-500');
    expect(btn?.className).toContain('text-slate-950');
    expect(btn?.className).toContain('min-h-[44px]');
  });

  test('supports secondary, ghost, and danger variants', () => {
    const { container: c1, unmount: u1 } = render(<Button variant="secondary">Batal</Button>);
    let btn = c1.querySelector('button') as any;
    expect(btn?.className).toContain('bg-[#1A1D2B]');
    u1();

    const { container: c2, unmount: u2 } = render(<Button variant="ghost">Batal</Button>);
    btn = c2.querySelector('button') as any;
    expect(btn?.className).toContain('bg-transparent');
    u2();

    const { container: c3 } = render(<Button variant="danger">Hapus</Button>);
    btn = c3.querySelector('button') as any;
    expect(btn?.className).toContain('bg-rose-500/10');
    expect(btn?.className).toContain('text-rose-400');
  });

  test('supports fullWidth and tactile micro-interaction styling', () => {
    const { container } = render(<Button fullWidth>Lanjut</Button>);
    const btn = container.querySelector('button') as any;
    expect(btn?.className).toContain('w-full');
    expect(btn?.className).toContain('active:scale-[0.98]');
  });

  test('displays loading spinner and disables button when isLoading is true', () => {
    let clicked = false;
    const { container } = render(
      <Button isLoading onClick={() => { clicked = true; }}>
        Simpan
      </Button>
    );
    const btn = container.querySelector('button') as any;
    expect(btn?.disabled).toBe(true);
    expect(btn?.querySelector('svg.animate-spin')).not.toBeNull();
    btn?.click();
    expect(clicked).toBe(false);
  });
});
